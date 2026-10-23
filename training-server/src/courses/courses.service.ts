import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/types';
import { pageArgs, pageMeta } from '../common/pagination.dto';
import { FILE_RULES, FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesDto } from './dto/list-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaymentStatus, Prisma, Role } from '../generated/client';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  overview: true,
  learningOutcomes: true,
  price: true,
  requiresPreviousCertification: true,
  difficulty: true,
  pictureFileId: true,
  createdAt: true,
  _count: { select: { contents: true } },
} satisfies Prisma.CourseSelect;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  isPublished: true,
  passMark: true,
  updatedAt: true,
  _count: { select: { contents: true, enrollments: true, questions: true } },
} satisfies Prisma.CourseSelect;

type Serializable = {
  id: string;
  price: Prisma.Decimal;
  pictureFileId: string | null;
  _count: { contents: number; enrollments?: number; questions?: number };
};

/** price -> number, hides the internal file id, exposes a picture URL instead */
function serialize<T extends Serializable>(course: T, pictureBase: string) {
  const { pictureFileId, price, _count, ...rest } = course;
  return {
    ...rest,
    price: Number(price),
    pictureUrl: pictureFileId ? `${pictureBase}/${course.id}/picture` : null,
    contentCount: _count.contents,
    ...(_count.enrollments !== undefined ? { enrollmentCount: _count.enrollments } : {}),
    ...(_count.questions !== undefined ? { questionCount: _count.questions } : {}),
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
  ) {}

  // ------------------------------------------------------------------ public
  async listPublished(q: ListCoursesDto) {
    const where: Prisma.CourseWhereInput = { isPublished: true, ...(q.difficulty ? { difficulty: q.difficulty } : {}) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({ where, ...pageArgs(q), orderBy: { createdAt: 'desc' }, select: PUBLIC_SELECT }),
    ]);
    return { data: rows.map((c) => serialize(c, '/courses')), meta: pageMeta(q, total) };
  }

  async getPublished(id: string) {
    const course = await this.prisma.course.findFirst({ where: { id, isPublished: true }, select: PUBLIC_SELECT });
    if (!course) throw new NotFoundException('Course not found');
    return serialize(course, '/courses');
  }

  async publishedPictureId(id: string) {
    const c = await this.prisma.course.findFirst({
      where: { id, isPublished: true },
      select: { pictureFileId: true },
    });
    if (!c?.pictureFileId) throw new NotFoundException('Picture not found');
    return c.pictureFileId;
  }

  // ------------------------------------------------------------------- admin
  async listAll(q: ListCoursesDto) {
    const where: Prisma.CourseWhereInput = q.difficulty ? { difficulty: q.difficulty } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({ where, ...pageArgs(q), orderBy: { createdAt: 'desc' }, select: ADMIN_SELECT }),
    ]);
    return { data: rows.map((c) => serialize(c, '/admin/courses')), meta: pageMeta(q, total) };
  }

  async getAny(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, select: ADMIN_SELECT });
    if (!course) throw new NotFoundException('Course not found');
    return serialize(course, '/admin/courses');
  }

  async anyPictureId(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id }, select: { pictureFileId: true } });
    if (!c?.pictureFileId) throw new NotFoundException('Picture not found');
    return c.pictureFileId;
  }

  async create(dto: CreateCourseDto, picture: Express.Multer.File | undefined, adminId: string) {
    if (dto.isPublished) {
      throw new BadRequestException(
        'A course needs at least one content file before it can be published. Create it as a draft, add content, then publish.',
      );
    }
    const stored = picture ? await this.files.save(picture, FILE_RULES.image) : null;
    try {
      const course = await this.prisma.course.create({
        data: {
          name: dto.name,
          overview: dto.overview,
          learningOutcomes: dto.learningOutcomes,
          price: dto.price,
          requiresPreviousCertification: dto.requiresPreviousCertification ?? false,
          difficulty: dto.difficulty,
          isPublished: false,
          pictureFileId: stored?.id,
          createdById: adminId,
        },
        select: ADMIN_SELECT,
      });
      return serialize(course, '/admin/courses');
    } catch (err) {
      await this.files.deleteMany([stored?.id]);
      throw err;
    }
  }

  async update(id: string, dto: UpdateCourseDto, picture: Express.Multer.File | undefined) {
    const existing = await this.prisma.course.findUnique({ where: { id }, select: { pictureFileId: true } });
    if (!existing) throw new NotFoundException('Course not found');

    const stored = picture ? await this.files.save(picture, FILE_RULES.image) : null;
    try {
      const course = await this.prisma.course.update({
        where: { id },
        data: {
          name: dto.name,
          overview: dto.overview,
          learningOutcomes: dto.learningOutcomes,
          price: dto.price,
          requiresPreviousCertification: dto.requiresPreviousCertification,
          difficulty: dto.difficulty,
          pictureFileId: stored?.id,
        },
        select: ADMIN_SELECT,
      });
      if (stored) await this.files.deleteMany([existing.pictureFileId]);
      return serialize(course, '/admin/courses');
    } catch (err) {
      await this.files.deleteMany([stored?.id]);
      throw err;
    }
  }

  async setPublished(id: string, publish: boolean) {
    if (publish) {
      const issues = await this.publishIssues(id);
      if (issues.length) throw new BadRequestException(`This course is not ready to publish. ${issues.join(' ')}`);
    } else if (!(await this.prisma.course.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Course not found');
    }
    const updated = await this.prisma.course.update({
      where: { id },
      data: { isPublished: publish },
      select: ADMIN_SELECT,
    });
    return serialize(updated, '/admin/courses');
  }

  /** What is still missing before a course can be published (empty = ready). */
  async publishIssues(id: string, passMark?: number | null): Promise<string[]> {
    const c = await this.prisma.course.findUnique({
      where: { id },
      select: { passMark: true, _count: { select: { contents: true, questions: true } } },
    });
    if (!c) throw new NotFoundException('Course not found');

    const issues: string[] = [];
    if (c._count.contents < 1) issues.push('Add at least one content file.');
    if (c._count.questions < 1) issues.push('Add at least one assessment question.');
    if ((passMark ?? c.passMark) == null) issues.push('Set a pass mark.');
    return issues;
  }

  /** Where the 4-step course setup stands, so the admin can leave and resume later. */
  async setup(id: string) {
    const c = await this.prisma.course.findUnique({
      where: { id },
      select: { isPublished: true, passMark: true, _count: { select: { contents: true, questions: true } } },
    });
    if (!c) throw new NotFoundException('Course not found');

    const issues = await this.publishIssues(id);
    const content = c._count.contents > 0;
    const assessment = c._count.questions > 0;
    return {
      courseId: id,
      isPublished: c.isPublished,
      passMark: c.passMark,
      canPublish: issues.length === 0,
      issues,
      steps: {
        overview: { done: true },
        content: { done: content, count: c._count.contents },
        assessment: { done: assessment, count: c._count.questions },
        finish: { done: c.isPublished, passMark: c.passMark },
      },
      nextStep: !content ? 'content' : !assessment ? 'assessment' : !c.isPublished ? 'finish' : null,
    };
  }

  async remove(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        pictureFileId: true,
        contents: { select: { fileId: true } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course._count.enrollments > 0) {
      throw new ConflictException('This course has enrollments and cannot be deleted. Unpublish it instead.');
    }

    await this.prisma.course.delete({ where: { id } }); // content rows cascade
    await this.files.deleteMany([course.pictureFileId, ...course.contents.map((c) => c.fileId)]);
    return { message: 'Course deleted' };
  }

  // ------------------------------------------------------------- enrollment
  async enroll(user: AuthUser, courseId: string) {
    if (user.role !== Role.USER) throw new ForbiddenException('Only learners can enroll in courses');

    const course = await this.prisma.course.findFirst({ where: { id: courseId, isPublished: true } });
    if (!course) throw new NotFoundException('Course not found');

    const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Complete your profile before enrolling');

    if (course.requiresPreviousCertification && !(profile.hasPreviousCertification && profile.certificationApproved)) {
      throw new ForbiddenException(
        'This course requires an approved previous certification. Upload it in your profile and wait for approval.',
      );
    }

    try {
      const enrollment = await this.prisma.enrollment.create({
        data: { userId: user.id, courseId },
        select: { id: true, courseId: true, paymentStatus: true, enrolledAt: true },
      });
      return { message: 'Enrolled. Complete payment to unlock the course content.', enrollment };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('You are already enrolled in this course');
      }
      throw err;
    }
  }

  async myEnrollment(userId: string, courseId: string) {
    const e = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, paymentStatus: true, enrolledAt: true, paymentApprovedAt: true },
    });
    if (!e) return { enrolled: false };
    const passed = await this.prisma.assessmentAttempt.findFirst({
      where: { userId, courseId, passed: true },
      select: { id: true },
    });
    return { enrolled: true, ...e, unlocked: e.paymentStatus === PaymentStatus.APPROVED, assessmentPassed: !!passed };
  }
}
