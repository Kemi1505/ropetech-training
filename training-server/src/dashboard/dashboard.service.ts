import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/types';
import { CoursesService } from '../courses/courses.service';
import { ListCoursesDto } from '../courses/dto/list-courses.dto';
import { MyCoursesDto } from '../me/dto/my-courses.dto';
import { MeService } from '../me/me.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Role } from '../generated/enums';

/** A certification waiting for review: uploaded, not approved, not rejected. */
const CERTIFICATION_PENDING = {
  hasPreviousCertification: true,
  certificationFileId: { not: null },
  certificationApproved: false,
  certificationRejectedAt: null,
} as const;

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private me: MeService,
    private courses: CoursesService,
  ) {}

  get(user: AuthUser) {
    return user.role === Role.USER ? this.forUser(user) : this.forAdmin(user);
  }

  private async names(userId: string) {
    return this.prisma.profile.findUnique({ where: { userId }, select: { firstName: true, lastName: true } });
  }

  // ======================================================================= admin
  private async forAdmin(user: AuthUser) {
    const [published, unpublished, drafts, totalUsers, enrolledUsers, approvedPayments, pendingPayments, pendingCertifications, profile, recent] =
      await Promise.all([
        this.prisma.course.count({ where: { isPublished: true } }),
        this.prisma.course.count({ where: { isPublished: false } }), // drafts and unpublished together
        this.prisma.course.count({ where: { isPublished: false, publishedAt: null } }),
        this.prisma.user.count({ where: { role: Role.USER } }),
        this.prisma.user.count({ where: { enrollments: { some: {} } } }),
        this.prisma.enrollment.count({ where: { paymentStatus: PaymentStatus.APPROVED } }),
        this.prisma.enrollment.count({ where: { paymentStatus: PaymentStatus.PENDING } }),
        this.prisma.profile.count({ where: CERTIFICATION_PENDING }),
        this.names(user.id),
        this.prisma.enrollment.findMany({
          orderBy: { enrolledAt: 'desc' },
          take: 4,
          select: {
            id: true,
            userId: true,
            courseId: true,
            paymentStatus: true,
            enrolledAt: true,
            user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
            course: { select: { name: true } },
          },
        }),
      ]);

    // "Completed" needs the assessment result of just these few learners
    const passed = recent.length
      ? await this.prisma.assessmentAttempt.findMany({
          where: { passed: true, OR: recent.map((r) => ({ userId: r.userId, courseId: r.courseId })) },
          select: { userId: true, courseId: true },
        })
      : [];
    const passedKeys = new Set(passed.map((p) => `${p.userId}:${p.courseId}`));

    return {
      type: 'admin' as const,
      adminName: profile ? `${profile.firstName} ${profile.lastName}` : user.email,
      publishedCourses: published,
      unpublishedCourses: unpublished,
      draftCourses: drafts,
      totalUsers,
      enrolledUsers,
      approvedPayments,
      pendingPayments,
      pendingCertifications,
      pendingActions: { payments: pendingPayments, certifications: pendingCertifications, drafts },
      recentEnrollments: recent.map((r) => ({
        id: r.id,
        user: r.user.profile ? `${r.user.profile.firstName} ${r.user.profile.lastName}` : r.user.email,
        course: r.course.name,
        enrolledAt: r.enrolledAt,
        status:
          r.paymentStatus === PaymentStatus.APPROVED
            ? passedKeys.has(`${r.userId}:${r.courseId}`)
              ? 'COMPLETED'
              : 'ACTIVE'
            : r.paymentStatus === PaymentStatus.PENDING
              ? 'PAYMENT_PENDING'
              : r.paymentStatus === PaymentStatus.REJECTED
                ? 'PAYMENT_REJECTED'
                : 'NOT_PAID',
      })),
    };
  }

  // ====================================================================== learner
  private async forUser(user: AuthUser) {
    const [profile, mine, continueLearning] = await Promise.all([
      this.names(user.id),
      this.me.myCourses(user.id, { filter: 'all', page: 1, limit: 3 } as MyCoursesDto),
      this.me.continueLearning(user.id),
    ]);
    const hasEnrollments = mine.counts.all > 0;

    // new learner: featured courses. Returning learner: courses they have not enrolled in yet.
    const [featured, explore] = hasEnrollments
      ? [null, await this.me.explore(user.id, { page: 1, limit: 6 } as ListCoursesDto)]
      : [await this.courses.listPublished({ page: 1, limit: 6, featured: true } as ListCoursesDto), null];

    return {
      type: 'user' as const,
      firstName: profile?.firstName ?? null,
      hasEnrollments,
      continueLearning,
      myCourses: mine.data,
      featured: featured?.data ?? [],
      explore: explore?.data ?? [],
    };
  }
}
