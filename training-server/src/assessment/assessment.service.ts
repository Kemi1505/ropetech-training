import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateQuestionDto,
  FinishAssessmentDto,
  OptionDto,
  SubmitAssessmentDto,
  UpdateQuestionDto,
} from './dto/assessment.dto';
import { PaymentStatus, Prisma, Role } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types';
import { CoursesService } from '../courses/courses.service';

export const MAX_ATTEMPTS = 5;

const QUESTION_SELECT = {
  id: true,
  text: true,
  position: true,
  options: { orderBy: { position: 'asc' }, select: { id: true, text: true, isCorrect: true } },
} satisfies Prisma.QuestionSelect;

const ORDER = [{ position: 'asc' }, { createdAt: 'asc' }] satisfies Prisma.QuestionOrderByWithRelationInput[];

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private courses: CoursesService,
  ) {}

  // =========================================================== admin: build it
  private async mustFindCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true, passMark: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private validateOptions(options: OptionDto[]) {
    if (options.length !== 4) throw new BadRequestException('Each question needs exactly 4 options');
    if (options.filter((o) => o.isCorrect).length !== 1) {
      throw new BadRequestException('Mark exactly one option as correct');
    }
    if (new Set(options.map((o) => o.text.trim().toLowerCase())).size !== 4) {
      throw new BadRequestException('The 4 options must be different from each other');
    }
  }

  /** Everything, including the correct answers: for the admin editor. */
  async getForAdmin(courseId: string) {
    const course = await this.mustFindCourse(courseId);
    const questions = await this.prisma.question.findMany({
      where: { courseId },
      orderBy: ORDER,
      select: QUESTION_SELECT,
    });
    return {
      courseId,
      isPublished: course.isPublished,
      passMark: course.passMark,
      questionCount: questions.length,
      questions,
    };
  }

  async addQuestion(courseId: string, dto: CreateQuestionDto) {
    await this.mustFindCourse(courseId);
    this.validateOptions(dto.options);

    const last = await this.prisma.question.aggregate({ where: { courseId }, _max: { position: true } });
    return this.prisma.question.create({
      data: {
        courseId,
        text: dto.text,
        position: (last._max.position ?? 0) + 1,
        options: { create: dto.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, position: i })) },
      },
      select: QUESTION_SELECT,
    });
  }

  async updateQuestion(courseId: string, questionId: string, dto: UpdateQuestionDto) {
    const q = await this.prisma.question.findFirst({
      where: { id: questionId, courseId },
      select: { options: { orderBy: { position: 'asc' }, select: { id: true } } },
    });
    if (!q) throw new NotFoundException('Question not found');

    const options = dto.options;
    if (options) this.validateOptions(options);

    await this.prisma.$transaction([
      this.prisma.question.update({ where: { id: questionId }, data: { text: dto.text } }),
      // options are edited in place, so their ids stay stable
      ...(options ?? []).map((o, i) =>
        this.prisma.questionOption.update({
          where: { id: q.options[i].id },
          data: { text: o.text, isCorrect: o.isCorrect },
        }),
      ),
    ]);
    return this.prisma.question.findUnique({ where: { id: questionId }, select: QUESTION_SELECT });
  }

  async removeQuestion(courseId: string, questionId: string) {
    const course = await this.mustFindCourse(courseId);
    const exists = await this.prisma.question.findFirst({ where: { id: questionId, courseId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Question not found');

    if (course.isPublished && (await this.prisma.question.count({ where: { courseId } })) <= 1) {
      throw new ConflictException('A published course must keep at least one question. Unpublish the course first.');
    }
    await this.prisma.question.delete({ where: { id: questionId } });
    return { message: 'Question removed' };
  }

  /** Step 4: set the pass mark and (by default) publish, in one request. Can be called again to change the pass mark. */
  async finish(courseId: string, dto: FinishAssessmentDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true, _count: { select: { questions: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course._count.questions < 1) {
      throw new BadRequestException('Add at least one question before finishing the assessment.');
    }

    const publish = dto.publish ?? true;
    const willPublish = publish && !course.isPublished;
    if (willPublish) {
      const issues = await this.courses.publishIssues(courseId, dto.passMark);
      if (issues.length) throw new BadRequestException(`This course is not ready to publish. ${issues.join(' ')}`);
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { passMark: dto.passMark, ...(publish ? { isPublished: true } : {}) },
      select: { passMark: true, isPublished: true },
    });
    return { ...updated, message: willPublish ? 'Pass mark saved and the course is published.' : 'Pass mark saved.' };
  }

  /** Gives a learner their attempts back. Failed attempts stay in the history but stop counting. */
  async resetAttempts(courseId: string, userId: string) {
    await this.mustFindCourse(courseId);
    const { count } = await this.prisma.assessmentAttempt.updateMany({
      where: { courseId, userId, passed: false, voided: false },
      data: { voided: true },
    });
    return {
      reset: count,
      message: count ? `Attempts reset. The learner has ${MAX_ATTEMPTS} attempts again.` : 'There were no used attempts to reset.',
    };
  }

  // ============================================================ learner: take it
  /** Learners only, course visible to them, payment approved. */
  private async assertLearnerAccess(user: AuthUser, courseId: string) {
    if (user.role !== Role.USER) throw new ForbiddenException('Only learners can take the assessment');

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, OR: [{ isPublished: true }, { enrollments: { some: { userId: user.id } } }] },
      select: { id: true, passMark: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { paymentStatus: true },
    });
    if (enrollment?.paymentStatus !== PaymentStatus.APPROVED) {
      throw new ForbiddenException('Your payment must be approved before you can take the assessment');
    }
    return course;
  }

  /** The assessment unlocks only after every content file is marked completed. */
  private async contentProgress(userId: string, courseId: string) {
    const [total, done] = await Promise.all([
      this.prisma.courseContent.count({ where: { courseId } }),
      this.prisma.contentCompletion.count({ where: { userId, courseId } }),
    ]);
    return { total, done, complete: done >= total };
  }

  /** Attempts that count towards the limit (an admin reset stops earlier ones counting). */
  private attemptsUsed(userId: string, courseId: string) {
    return this.prisma.assessmentAttempt.count({ where: { userId, courseId, voided: false } });
  }

  private summary(
    a: { id: string; score: number; correctCount: number; totalQuestions: number; passMark: number; passed: boolean; submittedAt: Date },
    remaining: number,
  ) {
    const retry =
      remaining > 0
        ? `You have ${remaining} attempt${remaining === 1 ? '' : 's'} left. Review the course content and try again.`
        : 'You have no attempts left. Please contact an admin.';
    return {
      attemptId: a.id,
      score: a.score,
      correct: a.correctCount,
      total: a.totalQuestions,
      passMark: a.passMark,
      passed: a.passed,
      submittedAt: a.submittedAt,
      eligibleForCertificate: a.passed,
      message: a.passed
        ? 'You are eligible for a certificate. You have now completed this course.'
        : `You scored ${a.score}%. The pass mark is ${a.passMark}%. ${retry}`,
    };
  }

  /** Status of the assessment for this learner. Questions are only sent when they can actually take it. */
  async view(user: AuthUser, courseId: string) {
    const course = await this.assertLearnerAccess(user, courseId);
    const [totalQuestions, used, passedAttempt, content] = await Promise.all([
      this.prisma.question.count({ where: { courseId } }),
      this.attemptsUsed(user.id, courseId),
      this.prisma.assessmentAttempt.findFirst({ where: { userId: user.id, courseId, passed: true }, select: { id: true } }),
      this.contentProgress(user.id, courseId),
    ]);
    if (!totalQuestions || course.passMark == null) throw new NotFoundException('This course has no assessment yet');

    const passed = !!passedAttempt;
    const remaining = Math.max(0, MAX_ATTEMPTS - used);
    const blockedReason = passed
      ? 'PASSED'
      : !content.complete
        ? 'CONTENT_INCOMPLETE'
        : remaining === 0
          ? 'NO_ATTEMPTS_LEFT'
          : null;

    const questions = blockedReason
      ? []
      : await this.prisma.question.findMany({
          where: { courseId },
          orderBy: ORDER,
          select: { id: true, text: true, position: true, options: { orderBy: { position: 'asc' }, select: { id: true, text: true } } },
        });

    return {
      courseId,
      passMark: course.passMark,
      totalQuestions,
      maxAttempts: MAX_ATTEMPTS,
      attemptsUsed: used,
      attemptsRemaining: remaining,
      passed,
      canAttempt: blockedReason === null,
      blockedReason, // null | PASSED | CONTENT_INCOMPLETE | NO_ATTEMPTS_LEFT
      contentProgress: { done: content.done, total: content.total },
      questions,
    };
  }

  async submit(user: AuthUser, courseId: string, dto: SubmitAssessmentDto) {
    const course = await this.assertLearnerAccess(user, courseId);

    const alreadyPassed = await this.prisma.assessmentAttempt.findFirst({
      where: { userId: user.id, courseId, passed: true },
      select: { id: true },
    });
    if (alreadyPassed) throw new ConflictException('You have already passed this assessment.');

    const content = await this.contentProgress(user.id, courseId);
    if (!content.complete) {
      throw new ForbiddenException(
        `Finish all the course content before taking the assessment (${content.done} of ${content.total} done).`,
      );
    }

    const used = await this.attemptsUsed(user.id, courseId);
    if (used >= MAX_ATTEMPTS) {
      throw new ForbiddenException(`You have used all ${MAX_ATTEMPTS} attempts. Please contact an admin.`);
    }

    const questions = await this.prisma.question.findMany({
      where: { courseId },
      select: { id: true, options: { select: { id: true, isCorrect: true } } },
    });
    if (!questions.length || course.passMark == null) throw new NotFoundException('This course has no assessment yet');

    const byId = new Map(questions.map((q) => [q.id, q]));
    const answered = new Set<string>();
    let correct = 0;
    const answers: { questionId: string; optionId: string }[] = [];

    for (const a of dto.answers) {
      const q = byId.get(a.questionId);
      if (!q) continue; // the question was removed while the learner was answering
      if (answered.has(q.id)) throw new BadRequestException('Each question can only be answered once');
      const option = q.options.find((o) => o.id === a.optionId);
      if (!option) throw new BadRequestException('One of the selected options does not belong to its question');
      answered.add(q.id);
      answers.push({ questionId: q.id, optionId: option.id });
      if (option.isCorrect) correct++;
    }
    if (answered.size < questions.length) {
      throw new BadRequestException('Answer every question before submitting. If questions changed, reload the assessment.');
    }

    const score = Math.round((correct / questions.length) * 100);
    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        userId: user.id,
        courseId,
        score,
        correctCount: correct,
        totalQuestions: questions.length,
        passMark: course.passMark,
        passed: score >= course.passMark,
        answers,
      },
    });

    const remaining = Math.max(0, MAX_ATTEMPTS - (used + 1));
    return { ...this.summary(attempt, remaining), attemptsUsed: used + 1, attemptsRemaining: remaining };
  }

  /** Latest score. If the learner has passed, shows the passing attempt. */
  async myResult(user: AuthUser, courseId: string) {
    await this.assertLearnerAccess(user, courseId);
    const [latest, passedAttempt, used] = await Promise.all([
      this.prisma.assessmentAttempt.findFirst({ where: { userId: user.id, courseId }, orderBy: { submittedAt: 'desc' } }),
      this.prisma.assessmentAttempt.findFirst({ where: { userId: user.id, courseId, passed: true }, orderBy: { submittedAt: 'asc' } }),
      this.attemptsUsed(user.id, courseId),
    ]);
    const remaining = Math.max(0, MAX_ATTEMPTS - used);
    const shown = passedAttempt ?? latest;
    if (!shown) {
      return { attempted: false, passed: false, eligibleForCertificate: false, attemptsUsed: 0, attemptsRemaining: MAX_ATTEMPTS };
    }
    return { attempted: true, ...this.summary(shown, remaining), attemptsUsed: used, attemptsRemaining: remaining };
  }
}
