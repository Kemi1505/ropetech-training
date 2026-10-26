import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/types';
import { CURRENCY, formatMoney } from '../common/currency';
import { pageArgs, pageMeta } from '../common/pagination.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentQueryDto, SubmitPaymentDto } from './dto/payment.dto';
import { PaymentStatus, Prisma, Role } from '../generated/client';

const SUBMISSION_SELECT = {
  id: true,
  payerName: true,
  amountSent: true,
  status: true,
  rejectionReason: true,
  submittedAt: true,
  reviewedAt: true,
} satisfies Prisma.PaymentSubmissionSelect;

const REVIEW_SELECT = {
  enrollmentId: true,
  enrollment: {
    select: {
      userId: true,
      courseId: true,
      course: { select: { name: true } },
      user: { select: { email: true, profile: { select: { firstName: true } } } },
    },
  },
} satisfies Prisma.PaymentSubmissionSelect;

type ReviewedSubmission = Prisma.PaymentSubmissionGetPayload<{ select: typeof REVIEW_SELECT }>;
type SubmissionRow = Prisma.PaymentSubmissionGetPayload<{ select: typeof SUBMISSION_SELECT }>;
const serializeSubmission = (s: SubmissionRow) => ({ ...s, amountSent: Number(s.amountSent) });

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private notifications: NotificationsService,
  ) {}

  private assertLearner(user: AuthUser) {
    if (user.role !== Role.USER) throw new ForbiddenException('Only learners pay for courses');
  }

  private async enrollmentFor(userId: string, courseId: string) {
    const e = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true, paymentStatus: true, course: { select: { id: true, name: true, price: true } } },
    });
    if (!e) throw new NotFoundException('You are not enrolled in this course. Enroll first.');
    return e;
  }

  // ------------------------------------------------------------------ learner
  /** What the learner needs to pay: account details, the price, and where their payment stands. */
  async instructions(user: AuthUser, courseId: string) {
    this.assertLearner(user);
    const e = await this.enrollmentFor(user.id, courseId);
    const latest = await this.prisma.paymentSubmission.findFirst({
      where: { enrollmentId: e.id },
      orderBy: { submittedAt: 'desc' },
      select: SUBMISSION_SELECT,
    });

    return {
      enrollmentId: e.id,
      paymentStatus: e.paymentStatus,
      course: { id: e.course.id, name: e.course.name },
      amountDue: Number(e.course.price),
      currency: CURRENCY,
      bank: {
        bankName: this.config.getOrThrow<string>('PAYMENT_BANK_NAME'),
        accountNumber: this.config.getOrThrow<string>('PAYMENT_ACCOUNT_NUMBER'),
        accountName: this.config.getOrThrow<string>('PAYMENT_ACCOUNT_NAME'),
      },
      steps: [
        `Transfer ${formatMoney(Number(e.course.price))} to the account below.`,
        'Come back to this page and enter the name on the account you sent from, and the amount you sent.',
        'An admin will confirm your payment soon. The course unlocks once it is approved.',
      ],
      submission: latest ? serializeSubmission(latest) : null,
    };
  }

  async submit(user: AuthUser, courseId: string, dto: SubmitPaymentDto) {
    this.assertLearner(user);
    const e = await this.enrollmentFor(user.id, courseId);

    const submission = await this.prisma.$transaction(async (tx) => {
      // Only UNPAID or REJECTED can move to PENDING. This also stops double submits racing each other.
      const { count } = await tx.enrollment.updateMany({
        where: { id: e.id, paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.REJECTED] } },
        data: { paymentStatus: PaymentStatus.PENDING },
      });
      if (count === 0) {
        throw new ConflictException(
          e.paymentStatus === PaymentStatus.APPROVED
            ? 'Your payment has already been approved.'
            : 'You have already submitted a payment. An admin will approve it soon.',
        );
      }
      return tx.paymentSubmission.create({
        data: {
          enrollmentId: e.id,
          payerName: dto.payerName,
          amountSent: dto.amountSent,
          expectedAmount: e.course.price,
        },
        select: SUBMISSION_SELECT,
      });
    });

    await this.notifyAdmin(user, e.course.name, e.course.price, dto);

    return {
      message: 'Thank you. An admin will approve your payment soon.',
      submission: serializeSubmission(submission),
    };
  }

  /** The submission is already saved, so an email problem must not fail the request. */
  private async notifyAdmin(user: AuthUser, courseName: string, price: Prisma.Decimal, dto: SubmitPaymentDto) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: user.id },
        select: { firstName: true, lastName: true },
      });
      await this.mail.sendPaymentSubmitted({
        learnerName: profile ? `${profile.firstName} ${profile.lastName}` : user.email,
        learnerEmail: user.email,
        courseName,
        payerName: dto.payerName,
        amountSent: formatMoney(dto.amountSent),
        expectedAmount: formatMoney(Number(price)),
      });
    } catch (err) {
      this.logger.warn(`Payment email to admin failed: ${(err as Error).message}`);
    }
  }

  // -------------------------------------------------------------------- admin
  async list(q: PaymentQueryDto) {
    const where: Prisma.PaymentSubmissionWhereInput = q.status ? { status: q.status } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.paymentSubmission.count({ where }),
      this.prisma.paymentSubmission.findMany({
        where,
        ...pageArgs(q),
        orderBy: { submittedAt: q.status === PaymentStatus.PENDING ? 'asc' : 'desc' }, // oldest pending first
        select: {
          ...SUBMISSION_SELECT,
          expectedAmount: true,
          enrollment: {
            select: {
              id: true,
              user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
              course: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        status: r.status,
        payerName: r.payerName,
        amountSent: Number(r.amountSent),
        expectedAmount: Number(r.expectedAmount),
        amountMatches: Number(r.amountSent) === Number(r.expectedAmount),
        rejectionReason: r.rejectionReason,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
        enrollmentId: r.enrollment.id,
        course: r.enrollment.course,
        user: {
          id: r.enrollment.user.id,
          email: r.enrollment.user.email,
          name: r.enrollment.user.profile
            ? `${r.enrollment.user.profile.firstName} ${r.enrollment.user.profile.lastName}`
            : null,
        },
      })),
      meta: pageMeta(q, total),
    };
  }

  /** Numbers for the Pending / Approved / Rejected tabs. */
  async counts() {
    const grouped = await this.prisma.paymentSubmission.groupBy({ by: ['status'], _count: { _all: true } });
    const n = (s: PaymentStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;
    return { pending: n(PaymentStatus.PENDING), approved: n(PaymentStatus.APPROVED), rejected: n(PaymentStatus.REJECTED) };
  }

  async approve(id: string, adminId: string) {
    return this.review(id, adminId, PaymentStatus.APPROVED);
  }

  async reject(id: string, adminId: string, reason?: string) {
    return this.review(id, adminId, PaymentStatus.REJECTED, reason);
  }

  /** Goes to the learner's email from the database. A mail problem must not undo the decision. */
  private async notifyLearner(decision: 'APPROVED' | 'REJECTED', s: ReviewedSubmission, reason?: string) {
    const to = s.enrollment.user.email;
    const firstName = s.enrollment.user.profile?.firstName ?? null;
    const courseName = s.enrollment.course.name;
    const courseUrl = `${this.config.getOrThrow<string>('FRONTEND_URL')}/courses/${s.enrollment.courseId}`;
    await this.notifications.create(s.enrollment.userId, {
      type: decision === PaymentStatus.APPROVED ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
      title: decision === PaymentStatus.APPROVED ? 'Payment approved' : 'Payment not approved',
      body:
        decision === PaymentStatus.APPROVED
          ? `${courseName} is unlocked. You can start learning.`
          : `Your payment for ${courseName} was not approved.${reason ? ` Reason: ${reason}` : ''} You can submit it again.`,
      link: `/courses/${s.enrollment.courseId}`,
    });
    try {
      if (decision === PaymentStatus.APPROVED) {
        await this.mail.sendPaymentApproved({ to, firstName, courseName, courseUrl });
      } else {
        await this.mail.sendPaymentRejected({ to, firstName, courseName, courseUrl, reason: reason || null });
      }
    } catch (err) {
      this.logger.warn(`Payment ${decision.toLowerCase()} email to learner failed: ${(err as Error).message}`);
    }
  }

  private async review(id: string, adminId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    const existing = await this.prisma.paymentSubmission.findUnique({
      where: { id },
      select: REVIEW_SELECT,
    });
    if (!existing) throw new NotFoundException('Payment submission not found');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // Only a PENDING submission can be reviewed, and only once
      const { count } = await tx.paymentSubmission.updateMany({
        where: { id, status: PaymentStatus.PENDING },
        data: {
          status: decision,
          reviewedAt: now,
          reviewedById: adminId,
          rejectionReason: decision === PaymentStatus.REJECTED ? reason || null : null,
        },
      });
      if (count === 0) throw new ConflictException('This payment has already been reviewed');

      await tx.enrollment.update({
        where: { id: existing.enrollmentId },
        data:
          decision === PaymentStatus.APPROVED
            ? { paymentStatus: PaymentStatus.APPROVED, paymentApprovedAt: now, paymentApprovedById: adminId }
            : { paymentStatus: PaymentStatus.REJECTED },
      });
    });

    await this.notifyLearner(decision, existing, reason);

    return decision === PaymentStatus.APPROVED
      ? { message: 'Payment approved. The learner can now access the course.' }
      : { message: 'Payment rejected. The learner can submit again.' };
  }
}
