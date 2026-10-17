import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types';
import { PaymentStatus, Role } from '../generated/enums';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  get(user: AuthUser) {
    return user.role === Role.USER ? this.forUser(user) : this.forAdmin(user);
  }

  private async displayName(user: AuthUser) {
    const p = await this.prisma.profile.findUnique({
      where: { userId: user.id },
      select: { firstName: true, },
    });
    return p ? `${p.firstName}` : user.email;
  }

  private async forAdmin(user: AuthUser) {
    const [
      published, 
      unpublished, 
      enrolledUsers, 
      pendingPayments, 
      pendingCertifications, 
      adminName] =
      await Promise.all([
        this.prisma.course.count({ where: { isPublished: true } }),
        this.prisma.course.count({ where: { isPublished: false } }),
        this.prisma.user.count({ where: { enrollments: { some: {} } } }),
        this.prisma.enrollment.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
        this.prisma.profile.count({
          where: { 
            hasPreviousCertification: true, 
            certificationApproved: false, 
            certificationFileId: { not: null } },
        }),
        this.displayName(user),
      ]);

    return {
      type: 'admin' as const,
      adminName,
      publishedCourses: published,
      unpublishedCourses: unpublished,
      enrolledUsers,
      pendingPayments,
      pendingCertifications,
    };
  }

  private async forUser(user: AuthUser) {
    const [
      name, 
      enrollments, 
      completed
    ] = await Promise.all([
      this.displayName(user),
      this.prisma.enrollment.findMany({
        where: { userId: user.id },
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true,
          courseId: true,
          paymentStatus: true,
          course: {
            select: {
              name: true,
              isPublished: true,
              pictureFileId: true,
              _count: { select: { contents: true } },
            },
          },
        },
      }),
      this.prisma.contentCompletion.groupBy({
        by: ['courseId'],
        where: { userId: user.id },
        _count: { _all: true },
      }),
    ]);

    const done = new Map(completed.map((c) => [c.courseId, c._count._all]));

    const courses = enrollments.map((e) => {
      const total = e.course._count.contents;
      const progress = total ? Math.round(((done.get(e.courseId) ?? 0) / total) * 100) : 0;
      const paid = e.paymentStatus === PaymentStatus.APPROVED;
      const status = !paid ? 'PAYMENT_PENDING' : progress === 100 ? 'COMPLETED' : 'ONGOING';

      return {
        enrollmentId: e.id,
        courseId: e.courseId,
        name: e.course.name,
        pictureUrl: 
        e.course.isPublished 
        && e.course.pictureFileId 
        ? `/courses/${e.courseId}/picture` 
        : null,
        paymentStatus: e.paymentStatus,
        progress: paid ? progress : 0,
        status,
      };
    });

    return { 
      type: 'user' as const, 
      name, 
      courses };
  }
}
