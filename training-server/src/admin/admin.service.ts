import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { pageArgs, pageMeta, PaginationDto } from '../common/pagination.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { CertStatus, UsersQueryDto } from './dto/users-query.dto';
import { AuthMethod, Prisma, Role } from '../generated/client';

// --------------------------------------------------------------- certification
/** A learner who uploaded a previous certification. The three statuses split this group. */
const UPLOADED = { hasPreviousCertification: true, certificationFileId: { not: null } } satisfies Prisma.ProfileWhereInput;

const certWhere = (status: CertStatus): Prisma.ProfileWhereInput => ({
  ...UPLOADED,
  ...(status === 'APPROVED'
    ? { certificationApproved: true }
    : status === 'REJECTED'
      ? { certificationApproved: false, certificationRejectedAt: { not: null } }
      : { certificationApproved: false, certificationRejectedAt: null }),
});

type CertProfile = {
  hasPreviousCertification: boolean;
  certificationFileId: string | null;
  certificationApproved: boolean;
  certificationRejectedAt: Date | null;
} | null;

const certStatus = (p: CertProfile): CertStatus | 'NONE' =>
  !p || !p.hasPreviousCertification || !p.certificationFileId
    ? 'NONE'
    : p.certificationApproved
      ? 'APPROVED'
      : p.certificationRejectedAt
        ? 'REJECTED'
        : 'PENDING';

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  authType: true,
  createdAt: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      company: true,
      hasPreviousCertification: true,
      certificationFileId: true,
      certificationApproved: true,
      certificationRejectedAt: true,
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.UserSelect;

const nameOf = (p: { firstName: string; lastName: string } | null | undefined) => (p ? `${p.firstName} ${p.lastName}` : null);

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  // ================================================================= admins (superadmin)
  /** Email and a temporary password. No profile yet: the admin fills it in on first login. */
  async createAdmin(dto: CreateAdminDto) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: await bcrypt.hash(dto.password, 12), authType: AuthMethod.EMAIL_AND_PASSWORD, role: Role.ADMIN },
    });
    return toPublicUser(user);
  }

  /** The only permitted role change: ADMIN -> SUPERADMIN */
  async promoteToSuperadmin(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== Role.ADMIN) throw new BadRequestException('Only an admin can be promoted to superadmin');
    const updated = await this.prisma.user.update({ where: { id }, data: { role: Role.SUPERADMIN } });
    return toPublicUser(updated);
  }

  /** Deactivating an admin deletes the account. A superadmin can never be removed. */
  async removeAdmin(id: string, requesterId: string) {
    if (id === requesterId) throw new BadRequestException('You cannot remove your own account');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.SUPERADMIN) throw new ForbiddenException('A superadmin cannot be removed');
    if (user.role !== Role.ADMIN) throw new BadRequestException('Only admin accounts can be removed here');

    await this.prisma.user.delete({ where: { id } }); // profile, tokens and notifications go with it
    return { message: 'Admin removed' };
  }

  listAdmins(p: PaginationDto) {
    return this.listUsersWhere({ role: { in: [Role.ADMIN, Role.SUPERADMIN] } }, p);
  }

  // ======================================================================= learners
  async listUsers(q: UsersQueryDto) {
    const search: Prisma.UserWhereInput = q.search
      ? {
          OR: [
            { email: { contains: q.search, mode: 'insensitive' } },
            { profile: { is: { OR: [{ firstName: { contains: q.search, mode: 'insensitive' } }, { lastName: { contains: q.search, mode: 'insensitive' } }] } } },
          ],
        }
      : {};
    const cert: Prisma.UserWhereInput = !q.certification
      ? {}
      : q.certification === 'NONE'
        ? { NOT: { profile: { is: UPLOADED } } }
        : { profile: { is: certWhere(q.certification) } };

    return this.listUsersWhere({ role: Role.USER, ...search, ...cert }, q);
  }

  private async listUsersWhere(where: Prisma.UserWhereInput, p: PaginationDto) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, ...pageArgs(p), orderBy: { createdAt: 'desc' }, select: USER_SELECT }),
    ]);

    return {
      data: rows.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        authType: u.authType,
        createdAt: u.createdAt,
        firstName: u.profile?.firstName ?? null,
        lastName: u.profile?.lastName ?? null,
        phone: u.profile?.phone ?? null,
        company: u.profile?.company ?? null,
        certificationStatus: certStatus(u.profile),
        enrollments: u._count.enrollments,
      })),
      meta: pageMeta(p, total),
    };
  }

  /** One learner with their enrollments, for the side panel. */
  async getUser(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          select: { id: true, paymentStatus: true, enrolledAt: true, course: { select: { id: true, name: true } } },
        },
      },
    });
    if (!u) throw new NotFoundException('User not found');
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      firstName: u.profile?.firstName ?? null,
      lastName: u.profile?.lastName ?? null,
      phone: u.profile?.phone ?? null,
      company: u.profile?.company ?? null,
      certificationStatus: certStatus(u.profile),
      enrollments: u.enrollments.map((e) => ({ id: e.id, course: e.course, paymentStatus: e.paymentStatus, enrolledAt: e.enrolledAt })),
    };
  }

  // ===================================================================== enrollments
  async listEnrollments(q: EnrollmentQueryDto) {
    const where: Prisma.EnrollmentWhereInput = {
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.courseId ? { courseId: q.courseId } : {}),
      ...(q.search
        ? {
            user: {
              OR: [
                { email: { contains: q.search, mode: 'insensitive' } },
                { profile: { is: { OR: [{ firstName: { contains: q.search, mode: 'insensitive' } }, { lastName: { contains: q.search, mode: 'insensitive' } }] } } },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({
        where,
        ...pageArgs(q),
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true,
          userId: true,
          courseId: true,
          paymentStatus: true,
          enrolledAt: true,
          paymentApprovedAt: true,
          user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
          course: { select: { id: true, name: true, price: true, _count: { select: { lessons: true } } } },
        },
      }),
    ]);

    // progress per row: lessons completed out of the course's lessons
    const done = rows.length
      ? await this.prisma.lessonCompletion.groupBy({
          by: ['userId', 'courseId'],
          where: { OR: rows.map((r) => ({ userId: r.userId, courseId: r.courseId })) },
          _count: { _all: true },
        })
      : [];
    const doneMap = new Map(done.map((d) => [`${d.userId}:${d.courseId}`, d._count._all]));

    return {
      data: rows.map((e) => {
        const lessons = e.course._count.lessons;
        const finished = doneMap.get(`${e.userId}:${e.courseId}`) ?? 0;
        return {
          id: e.id,
          paymentStatus: e.paymentStatus,
          enrolledAt: e.enrolledAt,
          paymentApprovedAt: e.paymentApprovedAt,
          progress: lessons ? Math.round((finished / lessons) * 100) : 0,
          user: { id: e.user.id, email: e.user.email, name: nameOf(e.user.profile) },
          course: { id: e.course.id, name: e.course.name, price: Number(e.course.price) },
        };
      }),
      meta: pageMeta(q, total),
    };
  }

  // ================================================================== certifications
  async certificationCounts() {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.profile.count({ where: certWhere('PENDING') }),
      this.prisma.profile.count({ where: certWhere('APPROVED') }),
      this.prisma.profile.count({ where: certWhere('REJECTED') }),
    ]);
    return { pending, approved, rejected };
  }

  async listCertifications(status: CertStatus, p: PaginationDto) {
    const where = certWhere(status);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({
        where,
        ...pageArgs(p),
        orderBy: { updatedAt: status === 'PENDING' ? 'asc' : 'desc' }, // oldest pending first
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          updatedAt: true,
          certificationRejectionReason: true,
          user: { select: { email: true } },
        },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        userId: r.userId,
        name: `${r.firstName} ${r.lastName}`,
        email: r.user.email,
        phone: r.phone,
        company: r.company,
        submittedAt: r.updatedAt,
        status,
        rejectionReason: r.certificationRejectionReason,
        fileUrl: `/admin/users/${r.userId}/certification-file`,
      })),
      meta: pageMeta(p, total),
    };
  }

  async certificationFileId(userId: string) {
    const p = await this.prisma.profile.findUnique({ where: { userId }, select: { certificationFileId: true } });
    if (!p?.certificationFileId) throw new NotFoundException('No certification file for this user');
    return p.certificationFileId;
  }

  private async reviewable(userId: string) {
    const p = await this.prisma.profile.findUnique({
      where: { userId },
      select: { firstName: true, hasPreviousCertification: true, certificationFileId: true, certificationApproved: true, user: { select: { email: true } } },
    });
    if (!p) throw new NotFoundException('This user has not completed their profile');
    if (!p.hasPreviousCertification || !p.certificationFileId) {
      throw new BadRequestException('This user has not uploaded a certification file');
    }
    return p;
  }

  async approveCertification(userId: string) {
    const p = await this.reviewable(userId);
    if (p.certificationApproved) throw new ConflictException('Certification already approved');

    await this.prisma.profile.update({
      where: { userId },
      data: { certificationApproved: true, certificationApprovedAt: new Date(), certificationRejectionReason: null, certificationRejectedAt: null },
    });
    await this.notifications.create(userId, {
      type: 'CERTIFICATION_APPROVED',
      title: 'Certification approved',
      body: 'Your previous certification was approved. You can now enroll in courses that require it.',
      link: '/profile',
    });
    return { message: 'Certification approved' };
  }

  async rejectCertification(userId: string, reason: string) {
    const p = await this.reviewable(userId);
    if (p.certificationApproved) throw new ConflictException('Certification is already approved');

    await this.prisma.profile.update({
      where: { userId },
      data: { certificationRejectionReason: reason, certificationRejectedAt: new Date() },
    });
    await this.notifications.create(userId, {
      type: 'CERTIFICATION_REJECTED',
      title: 'Certification not approved',
      body: `Your previous certification was not approved. Reason: ${reason}`,
      link: '/profile',
    });
    try {
      await this.mail.sendCertificationRejected({
        to: p.user.email, // the learner's address from the database
        firstName: p.firstName,
        reason,
        profileUrl: `${this.config.getOrThrow<string>('FRONTEND_URL')}/profile`,
      });
    } catch {
      // the decision is saved and the in-app notification exists; a mail problem must not undo it
    }
    return { message: 'Certification rejected. The learner has been notified.' };
  }
}
