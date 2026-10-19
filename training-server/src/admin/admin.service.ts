import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { pageArgs, pageMeta, PaginationDto } from '../common/pagination.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { EnrollmentQueryDto } from './dto/enrollment-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthMethod, PaymentStatus, Prisma, Role } from '../generated/client';
import { toPublicUser } from '../users/users.service';

type CertProfile = { 
  hasPreviousCertification: boolean; 
  certificationApproved: boolean 
} | null;

const certStatus = (p: CertProfile) =>
  !p || !p.hasPreviousCertification ? 'NONE' : p.certificationApproved ? 'APPROVED' : 'PENDING';

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
      certificationApproved: true,
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------ admins (superadmin)
  async createAdmin(dto: CreateAdminDto) {
    if (await this.prisma.user.findUnique(
      { 
        where: { email: dto.email } 
      })) {
      throw new ConflictException('Email is already registered');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: await bcrypt.hash(dto.password, 12),
        authType: AuthMethod.EMAIL_AND_PASSWORD,
        role: Role.ADMIN,
        profile: { create: { firstName: dto.firstName, lastName: dto.lastName } },
      },
    });
    return { ...toPublicUser(user), firstName: dto.firstName, lastName: dto.lastName };
  }

  /** The only permitted role change: ADMIN -> SUPERADMIN */
  async promoteToSuperadmin(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== Role.ADMIN) 
      throw new BadRequestException('Only an admin can be promoted to superadmin');
    const updated = await this.prisma.user.update({ 
      where: { id }, 
      data: { role: Role.SUPERADMIN } });
    return toPublicUser(updated);
  }

  listAdmins(p: PaginationDto) {
    return this.listUsersWhere({ 
      role: { in: [Role.ADMIN, Role.SUPERADMIN] } 
    }, p);
  }

  // --------------------------------------------------------------------------- users
  listUsers(p: PaginationDto) {
    return this.listUsersWhere({ 
      role: Role.USER 
    }, p);
  }

  private async listUsersWhere(where: Prisma.UserWhereInput, p: PaginationDto) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        ...pageArgs(p),
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
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

  // ---------------------------------------------------------------------- payments
  async listEnrollments(q: EnrollmentQueryDto) {
    const where: Prisma.EnrollmentWhereInput = 
      q.paymentStatus ? { paymentStatus: q.paymentStatus } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({
        where,
        ...pageArgs(q),
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true,
          paymentStatus: true,
          enrolledAt: true,
          paymentApprovedAt: true,
          user: { 
            select: 
            { 
              id: true, 
              email: true, 
              profile: { 
                select: 
                { 
                  firstName: true, 
                  lastName: true 
                } } } },
          course: { 
            select: 
            { 
              id: true, 
              name: true, 
              price: true 
            } },
        },
      }),
    ]);

    return {
      data: rows.map((e) => ({
        id: e.id,
        paymentStatus: e.paymentStatus,
        enrolledAt: e.enrolledAt,
        paymentApprovedAt: e.paymentApprovedAt,
        user: {
          id: e.user.id,
          email: e.user.email,
          name: e.user.profile ? 
          `${e.user.profile.firstName} ${e.user.profile.lastName}` 
          : null,
        },
        course: { 
          id: e.course.id, 
          name: e.course.name, 
          price: Number(e.course.price) },
      })),
      meta: pageMeta(q, total),
    };
  }

  async approvePayment(enrollmentId: string, adminId: string) {
    const e = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!e) throw new NotFoundException('Enrollment not found');
    if (e.paymentStatus === PaymentStatus.APPROVED) 
      throw new ConflictException('Payment already approved');

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { 
        paymentStatus: PaymentStatus.APPROVED, 
        paymentApprovedAt: new Date(), 
        paymentApprovedById: adminId },
      select: { 
        id: true, 
        paymentStatus: true, 
        paymentApprovedAt: true },
    });
    return { 
      message: 'This user Payment is now approved.', 
      enrollment: updated };
  }

  // ------------------------------------------------------------------ certifications
  async listPendingCertifications(p: PaginationDto) {
    const where: Prisma.ProfileWhereInput = {
      hasPreviousCertification: true,
      certificationApproved: false,
      certificationFileId: { not: null },
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({
        where,
        ...pageArgs(p),
        orderBy: { updatedAt: 'asc' }, // oldest first
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          phone: true,
          company: true,
          updatedAt: true,
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
        fileUrl: `/admin/users/${r.userId}/certification-file`,
      })),
      meta: pageMeta(p, total),
    };
  }

  async certificationFileId(userId: string) {
    const p = await this.prisma.profile.findUnique(
      { 
        where: { userId }, 
        select: { certificationFileId: true } 
      });
    if (!p?.certificationFileId) 
      throw new NotFoundException('No certification file for this user');
    return p.certificationFileId;
  }

  async approveCertification(userId: string) {
    const p = await this.prisma.profile.findUnique({ where: { userId } });
    if (!p) 
      throw new NotFoundException('This user has not completed their profile');
    if (!p.hasPreviousCertification || !p.certificationFileId) {
      throw new BadRequestException('This user has not uploaded a certification file');
    }
    if (p.certificationApproved) throw new ConflictException('Certification already approved');

    await this.prisma.profile.update({
      where: { userId },
      data: 
      { 
        certificationApproved: true, 
        certificationApprovedAt: new Date() },
    });
    return { message: 'Certification approved' };
  }
}
