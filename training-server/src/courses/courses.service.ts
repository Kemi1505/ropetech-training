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
import { StorageService } from '../storage/storage.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AdminListCoursesDto, CourseStatus, ListCoursesDto } from './dto/list-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaymentStatus, Prisma, Role } from '../generated/client';

// ------------------------------------------------------------------ what we read
const CARD_SELECT = {
  id: true,
  name: true,
  shortDescription: true,
  price: true,
  difficulty: true,
  requiresPreviousCertification: true,
  isFeatured: true,
  pictureFileId: true,
  createdAt: true,
  _count: { select: { lessons: true } },
} satisfies Prisma.CourseSelect;

const DETAIL_SELECT = {
  ...CARD_SELECT,
  description: true,
  learningOutcomes: true,
  certificationRequirement: true,
  passMark: true,
  maxAttempts: true,
  _count: { select: { lessons: true, questions: true } },
  // titles only: lesson files are never part of the public course page
  sections: {
    orderBy: { position: 'asc' },
    select: { id: true, title: true, lessons: { orderBy: { position: 'asc' }, select: { id: true, title: true, type: true } } },
  },
} satisfies Prisma.CourseSelect;

const ADMIN_SELECT = {
  ...CARD_SELECT,
  isPublished: true,
  publishedAt: true,
  passMark: true,
  maxAttempts: true,
  updatedAt: true,
  _count: { select: { lessons: true, enrollments: true, questions: true } },
} satisfies Prisma.CourseSelect;

type CardRow = Prisma.CourseGetPayload<{ select: typeof CARD_SELECT }>;
type DetailRow = Prisma.CourseGetPayload<{ select: typeof DETAIL_SELECT }>;
type AdminRow = Prisma.CourseGetPayload<{ select: typeof ADMIN_SELECT }>;

// ------------------------------------------------------------- how we answer
/** Draft = never published. Unpublished = was live, now hidden. */
export const statusOf = (c: { isPublished: boolean; publishedAt: Date | null }): CourseStatus =>
  c.isPublished ? 'PUBLISHED' : c.publishedAt ? 'UNPUBLISHED' : 'DRAFT';

const pictureUrl = (c: { id: string; pictureFileId: string | null }, base: string) =>
  c.pictureFileId ? `${base}/${c.id}/picture` : null;

function toCard(c: CardRow, base: string) {
  const { pictureFileId: _hidden, price, _count, ...rest } = c;
  return { ...rest, price: Number(price), pictureUrl: pictureUrl(c, base), lessonCount: _count.lessons };
}

function toDetail(c: DetailRow, base: string) {
  const { pictureFileId: _hidden, price, _count, passMark, maxAttempts, ...rest } = c;
  return {
    ...rest,
    price: Number(price),
    pictureUrl: pictureUrl(c, base),
    lessonCount: _count.lessons,
    assessment: { questionCount: _count.questions, passMark, maxAttempts },
  };
}

function toAdmin(c: AdminRow, base: string) {
  const { pictureFileId: _hidden, price, _count, ...rest } = c;
  return {
    ...rest,
    price: Number(price),
    status: statusOf(c),
    pictureUrl: pictureUrl(c, base),
    lessonCount: _count.lessons,
    questionCount: _count.questions,
    enrollmentCount: _count.enrollments,
  };
}

const searchFilter = (search?: string): Prisma.CourseWhereInput =>
  search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

const statusFilter = (status?: CourseStatus): Prisma.CourseWhereInput => {
  if (status === 'PUBLISHED') return { isPublished: true };
  if (status === 'UNPUBLISHED') return { isPublished: false, publishedAt: { not: null } };
  if (status === 'DRAFT') return { isPublished: false, publishedAt: null };
  return {};
};

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
    private storage: StorageService,
  ) {}

  // ================================================================== public
  async listPublished(q: ListCoursesDto, notEnrolledUserId?: string) {
    const where: Prisma.CourseWhereInput = {
      isPublished: true,
      ...(notEnrolledUserId ? { enrollments: { none: { userId: notEnrolledUserId } } } : {}),
      ...(q.difficulty ? { difficulty: q.difficulty } : {}),
      ...searchFilter(q.search),
    };
    if (q.featured) return this.featured(where, q.limit);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({ where, ...pageArgs(q), orderBy: { createdAt: 'desc' }, select: CARD_SELECT }),
    ]);
    return { data: rows.map((c) => toCard(c, '/courses')), meta: pageMeta(q, total) };
  }

  /** Admin-chosen featured courses first, then the newest to fill the row. */
  private async featured(where: Prisma.CourseWhereInput, limit: number) {
    const chosen = await this.prisma.course.findMany({
      where: { ...where, isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: CARD_SELECT,
    });
    const fill =
      chosen.length < limit
        ? await this.prisma.course.findMany({
            where: { ...where, isFeatured: false },
            orderBy: { createdAt: 'desc' },
            take: limit - chosen.length,
            select: CARD_SELECT,
          })
        : [];
    const data = [...chosen, ...fill].map((c) => toCard(c, '/courses'));
    return { data, meta: { page: 1, limit, total: data.length, totalPages: 1 } };
  }

  async getPublished(id: string) {
    const course = await this.prisma.course.findFirst({ where: { id, isPublished: true }, select: DETAIL_SELECT });
    if (!course) throw new NotFoundException('Course not found');
    return toDetail(course, '/courses');
  }

  /** "Other courses" at the bottom of a course page: the newest others, not the same course. */
  async others(id: string, limit = 3) {
    const rows = await this.prisma.course.findMany({
      where: { isPublished: true, NOT: { id } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: CARD_SELECT,
    });
    return rows.map((c) => toCard(c, '/courses'));
  }

  async publishedPictureId(id: string) {
    const c = await this.prisma.course.findFirst({ where: { id, isPublished: true }, select: { pictureFileId: true } });
    if (!c?.pictureFileId) throw new NotFoundException('Picture not found');
    return c.pictureFileId;
  }

  // =================================================================== admin
  async listAll(q: AdminListCoursesDto) {
    const where: Prisma.CourseWhereInput = {
      ...statusFilter(q.status),
      ...(q.difficulty ? { difficulty: q.difficulty } : {}),
      ...searchFilter(q.search),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({ where, ...pageArgs(q), orderBy: { updatedAt: 'desc' }, select: ADMIN_SELECT }),
    ]);
    return { data: rows.map((c) => toAdmin(c, '/admin/courses')), meta: pageMeta(q, total) };
  }

  /** How many courses are in each status, for the tabs above the list. */
  async statusCounts() {
    const [published, unpublished, draft] = await Promise.all([
      this.prisma.course.count({ where: statusFilter('PUBLISHED') }),
      this.prisma.course.count({ where: statusFilter('UNPUBLISHED') }),
      this.prisma.course.count({ where: statusFilter('DRAFT') }),
    ]);
    return { all: published + unpublished + draft, published, unpublished, draft };
  }

  async getAny(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, select: ADMIN_SELECT });
    if (!course) throw new NotFoundException('Course not found');
    return toAdmin(course, '/admin/courses');
  }

  /** The course page exactly as a learner sees it, even for a draft. */
  async preview(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, select: { ...DETAIL_SELECT, isPublished: true, publishedAt: true } });
    if (!course) throw new NotFoundException('Course not found');
    return { ...toDetail(course, '/admin/courses'), status: statusOf(course) };
  }

  async anyPictureId(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id }, select: { pictureFileId: true } });
    if (!c?.pictureFileId) throw new NotFoundException('Picture not found');
    return c.pictureFileId;
  }

  async create(dto: CreateCourseDto, picture: Express.Multer.File | undefined, adminId: string) {
    if (dto.isPublished) {
      throw new BadRequestException('Create the course as a draft, finish the steps, then publish it from the last step.');
    }
    const stored = picture ? await this.files.save(picture, FILE_RULES.image) : null;
    try {
      const course = await this.prisma.course.create({
        data: {
          name: dto.name,
          shortDescription: dto.shortDescription,
          description: dto.description,
          price: dto.price,
          difficulty: dto.difficulty,
          learningOutcomes: dto.learningOutcomes ?? [],
          requiresPreviousCertification: dto.requiresPreviousCertification ?? false,
          certificationRequirement: dto.certificationRequirement || null,
          pictureFileId: stored?.id,
          createdById: adminId,
        },
        select: ADMIN_SELECT,
      });
      return toAdmin(course, '/admin/courses');
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
          shortDescription: dto.shortDescription,
          description: dto.description,
          price: dto.price,
          difficulty: dto.difficulty,
          learningOutcomes: dto.learningOutcomes,
          requiresPreviousCertification: dto.requiresPreviousCertification,
          // "no requirement" also clears the requirement text
          certificationRequirement:
            dto.requiresPreviousCertification === false ? null : dto.certificationRequirement === undefined ? undefined : dto.certificationRequirement || null,
          pictureFileId: stored?.id,
        },
        select: ADMIN_SELECT,
      });
      if (stored) await this.files.deleteMany([existing.pictureFileId]);
      return toAdmin(course, '/admin/courses');
    } catch (err) {
      await this.files.deleteMany([stored?.id]);
      throw err;
    }
  }

  /** What is still missing before a course can be published (empty = ready). */
  async publishIssues(id: string, passMark?: number | null): Promise<string[]> {
    const c = await this.prisma.course.findUnique({
      where: { id },
      select: {
        passMark: true,
        learningOutcomes: true,
        requiresPreviousCertification: true,
        certificationRequirement: true,
        _count: { select: { lessons: true, questions: true } },
      },
    });
    if (!c) throw new NotFoundException('Course not found');

    const issues: string[] = [];
    if (c._count.lessons < 1) issues.push('Add at least one lesson.');
    if (c.learningOutcomes.length < 1) issues.push('Add at least one learning outcome.');
    if (c.requiresPreviousCertification && !c.certificationRequirement) issues.push('Describe the required certification.');
    if (c._count.questions < 1) issues.push('Add at least one assessment question.');
    if ((passMark ?? c.passMark) == null) issues.push('Set a pass mark.');
    return issues;
  }

  /** Where the six-step setup stands, so the admin can leave and resume later. */
  async setup(id: string) {
    const c = await this.prisma.course.findUnique({
      where: { id },
      select: {
        isPublished: true,
        publishedAt: true,
        passMark: true,
        maxAttempts: true,
        learningOutcomes: true,
        requiresPreviousCertification: true,
        certificationRequirement: true,
        _count: { select: { lessons: true, questions: true, sections: true } },
      },
    });
    if (!c) throw new NotFoundException('Course not found');

    const issues = await this.publishIssues(id);
    const steps = {
      basic: { done: true },
      content: { done: c._count.lessons > 0, sections: c._count.sections, lessons: c._count.lessons },
      outcomes: { done: c.learningOutcomes.length > 0, count: c.learningOutcomes.length },
      requirements: {
        done: !c.requiresPreviousCertification || !!c.certificationRequirement,
        requiresPreviousCertification: c.requiresPreviousCertification,
      },
      assessment: { done: c._count.questions > 0, count: c._count.questions, passMark: c.passMark, maxAttempts: c.maxAttempts },
      review: { done: c.isPublished },
    };
    const order = ['content', 'outcomes', 'requirements', 'assessment', 'review'] as const;
    return {
      courseId: id,
      status: statusOf(c),
      canPublish: issues.length === 0,
      issues,
      steps,
      nextStep: order.find((k) => !steps[k].done) ?? null,
    };
  }

  async setPublished(id: string, publish: boolean) {
    const existing = await this.prisma.course.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!existing) throw new NotFoundException('Course not found');

    if (publish) {
      const issues = await this.publishIssues(id);
      if (issues.length) throw new BadRequestException(`This course is not ready to publish. ${issues.join(' ')}`);
    }
    const updated = await this.prisma.course.update({
      where: { id },
      data: publish ? { isPublished: true, publishedAt: existing.publishedAt ?? new Date() } : { isPublished: false },
      select: ADMIN_SELECT,
    });
    return toAdmin(updated, '/admin/courses');
  }

  async setFeatured(id: string, isFeatured: boolean) {
    if (!(await this.prisma.course.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Course not found');
    }
    const updated = await this.prisma.course.update({ where: { id }, data: { isFeatured }, select: ADMIN_SELECT });
    return toAdmin(updated, '/admin/courses');
  }

  async remove(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: {
        pictureFileId: true,
        lessons: { select: { fileKey: true } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course._count.enrollments > 0) {
      throw new ConflictException('This course has enrollments and cannot be deleted. Unpublish it instead.');
    }

    await this.prisma.course.delete({ where: { id } }); // sections, lessons and questions go with it
    await this.storage.deleteMany(course.lessons.map((l) => l.fileKey));
    await this.files.deleteMany([course.pictureFileId]);
    return { message: 'Course deleted' };
  }

  // ============================================================== enrollment
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
