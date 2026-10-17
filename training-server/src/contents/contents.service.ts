import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FILE_RULES, FilesService, kindOfMime } from '../files/files.service';
import { AddContentDto } from './dto/add-content.dto';
import { PrismaService } from '../prisma/prisma.service';
import { type AuthUser } from '../auth/types';
import { PaymentStatus, Role } from '../generated/enums';

@Injectable()
export class ContentsService {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
  ) {}

  private isStaff(user: AuthUser) {
    return user.role !== Role.USER;
  }

  private async hasAccess(userId: string, courseId: string) {
    const e = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { paymentStatus: true },
    });
    return e?.paymentStatus === PaymentStatus.APPROVED;
  }

  /**
   * Staff see every course. Learners see published courses, plus any course they are
   * enrolled in (unpublishing hides a course from the catalogue, not from people who enrolled).
   */
  private async assertCourseVisible(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findFirst({
      where: this.isStaff(user)
        ? { id: courseId }
        : { id: courseId, OR: [{ isPublished: true }, { enrollments: { some: { userId: user.id } } }] },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async progress(userId: string, courseId: string) {
    const [total, done] = await Promise.all([
      this.prisma.courseContent.count({ where: { courseId } }),
      this.prisma.contentCompletion.count({ where: { userId, courseId } }),
    ]);
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  // ------------------------------------------------------------------- view all
  async list(courseId: string, user: AuthUser) {
    await this.assertCourseVisible(courseId, user);
    const unlocked = this.isStaff(user) || (await this.hasAccess(user.id, courseId));

    const [rows, done] = await Promise.all([
      this.prisma.courseContent.findMany({
        where: { courseId },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          position: true,
          file: { select: { filename: true, mimeType: true, size: true } },
        },
      }),
      this.prisma.contentCompletion.findMany({
        where: { userId: user.id, courseId },
        select: { contentId: true },
      }),
    ]);
    const doneIds = new Set(done.map((d) => d.contentId));

    return {
      courseId,
      locked: !unlocked,
      progress: rows.length ? Math.round((doneIds.size / rows.length) * 100) : 0,
      contents: rows.map((c) => ({
        id: c.id,
        title: c.title,
        position: c.position,
        type: kindOfMime(c.file.mimeType),
        completed: doneIds.has(c.id),
        // file details stay hidden until the content is unlocked
        ...(unlocked ? { filename: c.file.filename, size: c.file.size } : {}),
      })),
    };
  }

  // ------------------------------------------------------------------------ add
  async add(courseId: string, dto: AddContentDto, file: Express.Multer.File | undefined) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found');

    const stored = await this.files.save(file, FILE_RULES.content);
    try {
      const last = await this.prisma.courseContent.aggregate({ where: { courseId }, _max: { position: true } });
      const content = await this.prisma.courseContent.create({
        data: {
          courseId,
          fileId: stored.id,
          title: dto.title || stored.filename.replace(/\.[^.]+$/, ''),
          position: (last._max.position ?? 0) + 1,
        },
        select: { id: true, title: true, position: true },
      });
      return { ...content, filename: stored.filename };
    } catch (err) {
      await this.files.deleteMany([stored.id]);
      throw err;
    }
  }

  // --------------------------------------------------------------------- remove
  async remove(courseId: string, contentId: string) {
    const content = await this.prisma.courseContent.findFirst({
      where: { id: contentId, courseId },
      select: { fileId: true, course: { select: { isPublished: true } } },
    });
    if (!content) throw new NotFoundException('Content not found');

    if (content.course.isPublished) {
      const count = await this.prisma.courseContent.count({ where: { courseId } });
      if (count <= 1) {
        throw new ConflictException('A published course must keep at least one file. Unpublish the course first.');
      }
    }

    await this.prisma.courseContent.delete({ where: { id: contentId } });
    await this.files.deleteMany([content.fileId]);
    return { message: 'File removed' };
  }

  // ----------------------------------------------------------------------- view
  /** Staff can open any file. Learners need an approved payment. */
  async fileIdFor(courseId: string, contentId: string, user: AuthUser) {
    await this.assertCourseVisible(courseId, user);
    const content = await this.prisma.courseContent.findFirst({
      where: { id: contentId, courseId },
      select: { fileId: true },
    });
    if (!content) throw new NotFoundException('Content not found');

    if (!this.isStaff(user) && !(await this.hasAccess(user.id, courseId))) {
      throw new ForbiddenException('Your payment must be approved before you can open this content');
    }
    return content.fileId;
  }

  // ------------------------------------------------------------------- progress
  async complete(courseId: string, contentId: string, user: AuthUser) {
    if (this.isStaff(user)) throw new ForbiddenException('Only learners track progress');
    await this.fileIdFor(courseId, contentId, user); // same existence + access checks

    await this.prisma.contentCompletion.upsert({
      where: { userId_contentId: { userId: user.id, contentId } },
      create: { userId: user.id, contentId, courseId },
      update: {},
    });
    const p = await this.progress(user.id, courseId);
    return { progress: p.percent, completedItems: p.done, totalItems: p.total, completed: p.done === p.total };
  }
}
