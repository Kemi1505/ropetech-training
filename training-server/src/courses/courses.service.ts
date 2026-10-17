import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { pageArgs, pageMeta } from '../common/pagination.dto';
import { FILE_RULES, FilesService } from '../files/files.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesDto } from './dto/list-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaymentStatus, Prisma, Role } from '../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { type AuthUser } from '../auth/types';

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
  updatedAt: true,
  _count: { select: { contents: true, enrollments: true } },
} satisfies Prisma.CourseSelect;

type Serializable = {
  id: string;
  price: Prisma.Decimal;
  pictureFileId: string | null;
  _count: { contents: number; enrollments?: number };
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
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { _count: { select: { contents: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (publish && course._count.contents < 1) {
      throw new BadRequestException('Add at least one content file before publishing this course.');
    }
    const updated = await this.prisma.course.update({
      where: { id },
      data: { isPublished: publish },
      select: ADMIN_SELECT,
    });
    return serialize(updated, '/admin/courses');
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
    return e ? { enrolled: true, ...e, unlocked: e.paymentStatus === PaymentStatus.APPROVED } : { enrolled: false };
  }
}
