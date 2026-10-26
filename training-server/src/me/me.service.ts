import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { CoursesService } from '../courses/courses.service';
import { AuthUser } from '../auth/types';
import { PaymentStatus } from '../generated/enums';
import { MyCoursesDto } from './dto/my-courses.dto';
import { ListCoursesDto } from '../courses/dto/list-courses.dto';

/** Where a learner is with one course. The widget on every list is built from this. */
export type CourseState =
  | 'NOT_PAID' // enrolled, nothing submitted
  | 'PAYMENT_PENDING' // submitted, waiting for an admin
  | 'PAYMENT_REJECTED'
  | 'READY_TO_START' // paid, no lesson completed yet
  | 'IN_PROGRESS'
  | 'COMPLETED'; // assessment passed

@Injectable()
export class MeService {
  constructor(
    private prisma: PrismaService,
    private profile: ProfileService,
    private courses: CoursesService,
  ) {}

  /** The logged-in user and their profile in one call (names always come from the profile). */
  async me(user: AuthUser) {
    return {
      user: { id: user.id, email: user.email, role: user.role },
      profile: await this.profile.viewOrNull(user.id),
    };
  }

  /** Every course the learner enrolled in, with its state, newest activity first. */
  private async states(userId: string) {
    const [enrollments, completions, passed] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId },
        orderBy: [{ lastOpenedAt: { sort: 'desc', nulls: 'last' } }, { enrolledAt: 'desc' }],
        select: {
          id: true,
          paymentStatus: true,
          lastOpenedAt: true,
          lastLessonId: true,
          enrolledAt: true,
          course: {
            select: {
              id: true,
              name: true,
              shortDescription: true,
              price: true,
              difficulty: true,
              isPublished: true,
              pictureFileId: true,
              _count: { select: { lessons: true, questions: true } },
            },
          },
        },
      }),
      this.prisma.lessonCompletion.groupBy({ by: ['courseId'], where: { userId }, _count: { _all: true } }),
      this.prisma.assessmentAttempt.findMany({ where: { userId, passed: true }, select: { courseId: true }, distinct: ['courseId'] }),
    ]);

    const done = new Map(completions.map((c) => [c.courseId, c._count._all]));
    const passedCourses = new Set(passed.map((p) => p.courseId));

    return enrollments.map((e) => {
      const lessons = e.course._count.lessons;
      const finished = done.get(e.course.id) ?? 0;
      const progress = lessons ? Math.round((finished / lessons) * 100) : 0;
      const paid = e.paymentStatus === PaymentStatus.APPROVED;
      // with an assessment, "completed" means passed; without one, all lessons done
      const completed = paid && (e.course._count.questions > 0 ? passedCourses.has(e.course.id) : lessons > 0 && finished >= lessons);

      const state: CourseState = !paid
        ? e.paymentStatus === PaymentStatus.PENDING
          ? 'PAYMENT_PENDING'
          : e.paymentStatus === PaymentStatus.REJECTED
            ? 'PAYMENT_REJECTED'
            : 'NOT_PAID'
        : completed
          ? 'COMPLETED'
          : progress > 0
            ? 'IN_PROGRESS'
            : 'READY_TO_START';

      return {
        enrollmentId: e.id,
        courseId: e.course.id,
        name: e.course.name,
        shortDescription: e.course.shortDescription,
        difficulty: e.course.difficulty,
        price: Number(e.course.price),
        // unpublished courses are hidden from the catalogue, so their picture URL is too
        pictureUrl: e.course.isPublished && e.course.pictureFileId ? `/courses/${e.course.id}/picture` : null,
        lessonCount: lessons,
        paymentStatus: e.paymentStatus,
        state,
        progress,
        amountDue: state === 'NOT_PAID' || state === 'PAYMENT_REJECTED' ? Number(e.course.price) : 0,
        lastOpenedAt: e.lastOpenedAt,
        lastLessonId: e.lastLessonId,
        enrolledAt: e.enrolledAt,
      };
    });
  }

  /** "My courses" with the pills: all, in-progress, completed. */
  async myCourses(userId: string, q: MyCoursesDto) {
    const all = await this.states(userId);
    const counts = {
      all: all.length,
      inProgress: all.filter((c) => c.state === 'IN_PROGRESS').length,
      completed: all.filter((c) => c.state === 'COMPLETED').length,
    };
    const filtered =
      q.filter === 'in-progress' ? all.filter((c) => c.state === 'IN_PROGRESS')
      : q.filter === 'completed' ? all.filter((c) => c.state === 'COMPLETED')
      : all;

    const start = (q.page - 1) * q.limit;
    return {
      data: filtered.slice(start, start + q.limit),
      counts,
      meta: { page: q.page, limit: q.limit, total: filtered.length, totalPages: Math.ceil(filtered.length / q.limit) },
    };
  }

  /** Published courses the learner has not enrolled in yet ("Explore more courses"). */
  explore(userId: string, q: ListCoursesDto) {
    return this.courses.listPublished({ ...q, featured: false }, userId);
  }

  /** The Enrollments page (cart icon): every enrolled course, plus what is still owed. */
  async enrollments(userId: string) {
    const items = await this.states(userId);
    return {
      data: items,
      summary: {
        unpaidCount: items.filter((i) => i.state === 'NOT_PAID' || i.state === 'PAYMENT_REJECTED').length,
        pendingCount: items.filter((i) => i.state === 'PAYMENT_PENDING').length,
        amountDue: items.reduce((sum, i) => sum + i.amountDue, 0),
      },
    };
  }

  /** The first lesson (in course order) the learner has not completed. */
  private async nextLessonId(userId: string, courseId: string) {
    const [lessons, done] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { courseId },
        select: { id: true, position: true, section: { select: { position: true } } },
      }),
      this.prisma.lessonCompletion.findMany({ where: { userId, courseId }, select: { lessonId: true } }),
    ]);
    const doneIds = new Set(done.map((d) => d.lessonId));
    const ordered = lessons.sort((a, b) => a.section.position - b.section.position || a.position - b.position);
    return ordered.find((l) => !doneIds.has(l.id))?.id ?? null;
  }

  /**
   * The "Continue where you left off" panel:
   * the most recently opened unfinished course, or else a course that still needs payment, or null.
   */
  async continueLearning(userId: string) {
    const items = await this.states(userId); // already sorted by latest activity
    const active = items.filter((i) => i.state === 'IN_PROGRESS' || i.state === 'READY_TO_START');
    const pick = active.find((i) => i.lastOpenedAt) ?? active[0];
    if (pick) {
      return { kind: 'CONTINUE' as const, course: pick, nextLessonId: await this.nextLessonId(userId, pick.courseId) };
    }
    const unpaid = items.find((i) => i.state === 'NOT_PAID' || i.state === 'PAYMENT_REJECTED');
    return unpaid ? { kind: 'PAYMENT' as const, course: unpaid } : null;
  }
}
