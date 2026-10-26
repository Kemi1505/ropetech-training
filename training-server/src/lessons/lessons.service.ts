import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { 
  CreateLessonDto, 
  MoveLessonDto, 
  SectionDto, 
  UpdateLessonDto, 
  UploadUrlDto 
} from './dto/lesson.dto';
import { LESSON_RULES } from './lesson-rules';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthUser } from '../auth/types';
import { PaymentStatus, Role } from '../generated/enums';
import { Prisma } from '../generated/client';

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');
const MB = 1024 * 1024;

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ================================================================ helpers
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

  /** Staff see every course. Learners see published courses and any course they enrolled in. */
  private async assertCourseVisible(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findFirst({
      where: this.isStaff(user)
        ? { id: courseId }
        : { id: courseId, OR: [{ isPublished: true }, { enrollments: { some: { userId: user.id } } }] },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async mustCourse(courseId: string) {
    const c = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, isPublished: true } });
    if (!c) throw new NotFoundException('Course not found');
    return c;
  }

  private async mustSection(courseId: string, sectionId: string) {
    const s = await this.prisma.section.findFirst({ where: { id: sectionId, courseId }, select: { id: true } });
    if (!s) throw new NotFoundException('Section not found');
    return s;
  }

  private async mustLesson(courseId: string, lessonId: string) {
    const l = await this.prisma.lesson.findFirst({ where: { id: lessonId, courseId } });
    if (!l) throw new NotFoundException('Lesson not found');
    return l;
  }

  /** A published course must always keep at least one lesson. */
  private async assertCanRemove(courseId: string, isPublished: boolean, removing: number) {
    if (!isPublished) return;
    const total = await this.prisma.lesson.count({ where: { courseId } });
    if (total - removing < 1) {
      throw new ConflictException('A published course must keep at least one lesson. Unpublish the course first.');
    }
  }

  /** Lesson ids in the order a learner meets them: by section, then by position. */
  private async orderedLessonIds(courseId: string) {
    const rows = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true, position: true, section: { select: { position: true } } },
    });
    return rows
      .sort((a, b) => a.section.position - b.section.position || a.position - b.position)
      .map((r) => r.id);
  }

  private async progress(userId: string, courseId: string) {
    const [total, done] = await Promise.all([
      this.prisma.lesson.count({ where: { courseId } }),
      this.prisma.lessonCompletion.count({ where: { userId, courseId } }),
    ]);
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  /** Check that `ids` is exactly the set of existing ids, then save the new order as positions 1..n. */
  private async applyOrder(
    existingIds: string[],
    ids: string[],
    update: (id: string, position: number) => Prisma.PrismaPromise<unknown>,
  ) {
    const same = ids.length === existingIds.length && new Set(ids).size === ids.length && ids.every((id) => existingIds.includes(id));
    if (!same) throw new BadRequestException('Send every id exactly once, in the new order.');
    await this.prisma.$transaction(ids.map((id, i) => update(id, i + 1)));
  }

  // ===================================================== admin: sections
  async outline(courseId: string) {
    await this.mustCourse(courseId);
    const sections = await this.prisma.section.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        position: true,
        lessons: {
          orderBy: { position: 'asc' },
          select: { id: true, title: true, type: true, position: true, fileName: true, fileSize: true },
        },
      },
    });
    return { courseId, sections };
  }

  async createSection(courseId: string, dto: SectionDto) {
    await this.mustCourse(courseId);
    const last = await this.prisma.section.aggregate({ where: { courseId }, _max: { position: true } });
    return this.prisma.section.create({
      data: { courseId, title: dto.title, position: (last._max.position ?? 0) + 1 },
      select: { id: true, title: true, position: true },
    });
  }

  async renameSection(courseId: string, sectionId: string, dto: SectionDto) {
    await this.mustSection(courseId, sectionId);
    return this.prisma.section.update({ where: { id: sectionId }, data: { title: dto.title }, select: { id: true, title: true, position: true } });
  }

  async deleteSection(courseId: string, sectionId: string) {
    const course = await this.mustCourse(courseId);
    await this.mustSection(courseId, sectionId);
    const lessons = await this.prisma.lesson.findMany({ where: { sectionId }, select: { fileKey: true } });
    await this.assertCanRemove(courseId, course.isPublished, lessons.length);

    await this.prisma.section.delete({ where: { id: sectionId } }); // its lessons are deleted with it
    await this.storage.deleteMany(lessons.map((l) => l.fileKey));
    return { message: 'Section removed' };
  }

  async reorderSections(courseId: string, ids: string[]) {
    await this.mustCourse(courseId);
    const existing = await this.prisma.section.findMany({ where: { courseId }, select: { id: true } });
    await this.applyOrder(existing.map((s) => s.id), ids, (id, position) =>
      this.prisma.section.update({ where: { id }, data: { position } }),
    );
    return this.outline(courseId);
  }

  // ====================================================== admin: lessons
  async reorderLessons(courseId: string, sectionId: string, ids: string[]) {
    await this.mustSection(courseId, sectionId);
    const existing = await this.prisma.lesson.findMany({ where: { sectionId }, select: { id: true } });
    await this.applyOrder(existing.map((l) => l.id), ids, (id, position) =>
      this.prisma.lesson.update({ where: { id }, data: { position } }),
    );
    return this.outline(courseId);
  }

  /** Step 1: validate what the admin wants to upload and hand back a signed upload URL. */
  async uploadUrl(courseId: string, dto: UploadUrlDto) {
    await this.mustCourse(courseId);
    const rule = LESSON_RULES[dto.type];
    const ext = extOf(dto.fileName);

    if (!rule.exts.includes(ext)) throw new BadRequestException(`A ${dto.type} lesson must be a .${rule.exts.join(' or .')} file.`);
    if (!rule.mimes.includes(dto.contentType)) throw new BadRequestException(`Unsupported file type: ${dto.contentType}`);
    if (dto.size > rule.maxBytes) {
      throw new BadRequestException(`File too large. A ${dto.type} lesson can be up to ${Math.round(rule.maxBytes / MB)} MB.`);
    }

    const key = `courses/${courseId}/lessons/${randomUUID()}.${ext}`; // the server picks the key, never the client
    const uploadUrl = await this.storage.uploadUrl(key, dto.contentType, dto.size);
    return {
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': dto.contentType }, // must be sent exactly like this
      key,
      expiresInSeconds: 900,
    };
  }

  /** Step 2: the browser has uploaded the file. Verify it really arrived, then create the lesson. */
  async createLesson(courseId: string, sectionId: string, dto: CreateLessonDto) {
    await this.mustSection(courseId, sectionId);
    const rule = LESSON_RULES[dto.type];

    if (!dto.fileKey.startsWith(`courses/${courseId}/lessons/`)) throw new BadRequestException('Invalid file key.');
    if (!rule.exts.includes(extOf(dto.fileKey))) throw new BadRequestException('The file does not match the lesson type.');
    if (await this.prisma.lesson.findFirst({ where: { fileKey: dto.fileKey }, select: { id: true } })) {
      throw new ConflictException('That file is already used by another lesson.');
    }

    const head = await this.storage.head(dto.fileKey);
    if (!head) throw new BadRequestException('The file was not uploaded. Upload it first, then create the lesson.');

    const reject = async (message: string) => {
      await this.storage.deleteMany([dto.fileKey]); // don't leave a bad file behind
      throw new BadRequestException(message);
    };
    if (head.size > rule.maxBytes) return reject('The uploaded file is too large.');
    if (!rule.mimes.includes(head.contentType)) return reject('The uploaded file has the wrong type.');
    if (!rule.magic(await this.storage.peek(dto.fileKey))) return reject(`The uploaded file is not a valid ${dto.type} file.`);

    const last = await this.prisma.lesson.aggregate({ where: { sectionId }, _max: { position: true } });
    return this.prisma.lesson.create({
      data: {
        courseId,
        sectionId,
        title: dto.title,
        type: dto.type,
        position: (last._max.position ?? 0) + 1,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        fileSize: head.size,
        mimeType: head.contentType,
      },
      select: { id: true, title: true, type: true, position: true, fileName: true, fileSize: true },
    });
  }

  async updateLesson(courseId: string, lessonId: string, dto: UpdateLessonDto) {
    await this.mustLesson(courseId, lessonId);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { title: dto.title },
      select: { id: true, title: true, type: true, position: true },
    });
  }

  async deleteLesson(courseId: string, lessonId: string) {
    const course = await this.mustCourse(courseId);
    const lesson = await this.mustLesson(courseId, lessonId);
    await this.assertCanRemove(courseId, course.isPublished, 1);

    await this.prisma.lesson.delete({ where: { id: lessonId } });
    // Duplicated lessons have their own copy of the file, so deleting this key is safe.
    await this.storage.deleteMany([lesson.fileKey]);
    return { message: 'Lesson removed' };
  }

  async moveLesson(courseId: string, lessonId: string, dto: MoveLessonDto) {
    const lesson = await this.mustLesson(courseId, lessonId);
    await this.mustSection(courseId, dto.sectionId);

    const target = await this.prisma.lesson.findMany({
      where: { sectionId: dto.sectionId, NOT: { id: lessonId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const index = dto.position ? Math.min(dto.position - 1, target.length) : target.length;
    const newOrder = [...target.map((l) => l.id)];
    newOrder.splice(index, 0, lessonId);

    const writes: Prisma.PrismaPromise<unknown>[] = newOrder.map((id, i) =>
      this.prisma.lesson.update({ where: { id }, data: { position: i + 1, sectionId: dto.sectionId } }),
    );
    if (lesson.sectionId !== dto.sectionId) {
      const rest = await this.prisma.lesson.findMany({
        where: { sectionId: lesson.sectionId, NOT: { id: lessonId } },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      rest.forEach((l, i) => writes.push(this.prisma.lesson.update({ where: { id: l.id }, data: { position: i + 1 } })));
    }
    await this.prisma.$transaction(writes);
    return this.outline(courseId);
  }

  async duplicateLesson(courseId: string, lessonId: string) {
    const lesson = await this.mustLesson(courseId, lessonId);
    const newKey = `courses/${courseId}/lessons/${randomUUID()}.${extOf(lesson.fileKey)}`;
    await this.storage.copy(lesson.fileKey, newKey);

    const siblings = await this.prisma.lesson.findMany({
      where: { sectionId: lesson.sectionId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const copy = await this.prisma.lesson.create({
      data: {
        courseId,
        sectionId: lesson.sectionId,
        title: `Copy of ${lesson.title}`.slice(0, 150),
        type: lesson.type,
        position: siblings.length + 1,
        fileKey: newKey,
        fileName: lesson.fileName,
        fileSize: lesson.fileSize,
        mimeType: lesson.mimeType,
      },
      select: { id: true },
    });

    // put the copy right after the original
    const order = siblings.map((s) => s.id);
    order.splice(order.indexOf(lessonId) + 1, 0, copy.id);
    await this.prisma.$transaction(order.map((id, i) => this.prisma.lesson.update({ where: { id }, data: { position: i + 1 } })));
    return this.outline(courseId);
  }

  // ===================================================== learners and staff
  /** The sections and lessons of a course. Files stay locked until payment is approved. */
  async curriculum(courseId: string, user: AuthUser) {
    await this.assertCourseVisible(courseId, user);
    const unlocked = this.isStaff(user) || (await this.hasAccess(user.id, courseId));

    const [sections, done] = await Promise.all([
      this.prisma.section.findMany({
        where: { courseId },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          position: true,
          lessons: {
            orderBy: { position: 'asc' },
            select: { id: true, title: true, type: true, position: true, fileName: true, fileSize: true },
          },
        },
      }),
      this.prisma.lessonCompletion.findMany({ where: { userId: user.id, courseId }, select: { lessonId: true } }),
    ]);
    const doneIds = new Set(done.map((d) => d.lessonId));
    const total = sections.reduce((n, s) => n + s.lessons.length, 0);
    const order = sections.flatMap((s) => s.lessons.map((l) => l.id));

    return {
      courseId,
      locked: !unlocked,
      progress: { done: doneIds.size, total, percent: total ? Math.round((doneIds.size / total) * 100) : 0 },
      nextLessonId: order.find((id) => !doneIds.has(id)) ?? null,
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          completed: doneIds.has(l.id),
          // file details stay hidden until the course is unlocked
          ...(unlocked ? { fileName: l.fileName, fileSize: l.fileSize } : {}),
        })),
      })),
    };
  }

  private async accessibleLesson(courseId: string, lessonId: string, user: AuthUser) {
    await this.assertCourseVisible(courseId, user);
    const lesson = await this.mustLesson(courseId, lessonId);
    if (!this.isStaff(user) && !(await this.hasAccess(user.id, courseId))) {
      throw new ForbiddenException('Your payment must be approved before you can open this lesson');
    }
    return lesson;
  }

  /** Open a lesson: returns a short-lived link to the file and the previous and next lesson. */
  async openLesson(courseId: string, lessonId: string, user: AuthUser) {
    const lesson = await this.accessibleLesson(courseId, lessonId, user);
    const rule = LESSON_RULES[lesson.type];

    const [url, order, completed] = await Promise.all([
      this.storage.downloadUrl(lesson.fileKey, { fileName: lesson.fileName, contentType: lesson.mimeType, inline: rule.inline }),
      this.orderedLessonIds(courseId),
      this.prisma.lessonCompletion.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } }, select: { lessonId: true } }),
    ]);

    if (!this.isStaff(user)) {
      // remember where the learner is, for "Continue learning"
      await this.prisma.enrollment.update({
        where: { userId_courseId: { userId: user.id, courseId } },
        data: { lastOpenedAt: new Date(), lastLessonId: lessonId },
      });
    }

    const i = order.indexOf(lessonId);
    return {
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      fileName: lesson.fileName,
      mimeType: lesson.mimeType,
      inline: rule.inline, // true: show in the page. false: offer a download
      url,
      urlExpiresInSeconds: 3600,
      completed: !!completed,
      previousLessonId: i > 0 ? order[i - 1] : null,
      nextLessonId: i < order.length - 1 ? order[i + 1] : null,
    };
  }

  async complete(courseId: string, lessonId: string, user: AuthUser) {
    if (this.isStaff(user)) throw new ForbiddenException('Only learners track progress');
    await this.accessibleLesson(courseId, lessonId, user);

    await this.prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId, courseId },
      update: {},
    });
    const p = await this.progress(user.id, courseId);
    return { progress: p.percent, completedItems: p.done, totalItems: p.total, allDone: p.total > 0 && p.done === p.total };
  }
}
