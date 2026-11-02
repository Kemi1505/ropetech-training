import type { Metadata } from 'next';
import { LinkButton } from '@/components/button';
import CoursePicture from '@/components/courses/course-picture';
import EmptyState from '@/components/courses/empty-state';
import StatusChip, { ChipKind } from '@/components/courses/status-chip';
import { card, h1 } from '@/components/ui/styles';
import { MyCourseItem } from '@/lib/app-types';
import { CourseState } from '@/lib/course-types';
import { formatPrice } from '@/lib/format';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Enrollments' };

const LABEL: Record<CourseState, { chip: ChipKind; text: string }> = {
  NOT_PAID: { chip: 'pending', text: 'Not paid' },
  PAYMENT_PENDING: { chip: 'pending', text: 'Payment pending' },
  PAYMENT_REJECTED: { chip: 'rejected', text: 'Payment rejected' },
  READY_TO_START: { chip: 'ready', text: 'Ready to start' },
  IN_PROGRESS: { chip: 'ready', text: 'In progress' },
  COMPLETED: { chip: 'done', text: 'Completed' },
};

function Action({ item }: { item: MyCourseItem }) {
  const page = `/courses/${item.courseId}`;
  switch (item.state) {
    case 'NOT_PAID':
      return <LinkButton href={`${page}?pay=details`} variant="accent" pill>Make payment</LinkButton>;
    case 'PAYMENT_PENDING':
      return <LinkButton href={`${page}?pay=status`} variant="soft" pill>View</LinkButton>;
    case 'PAYMENT_REJECTED':
      return <LinkButton href={`${page}?pay=submit`} variant="accent" pill>Submit again</LinkButton>;
    case 'READY_TO_START':
      return <LinkButton href={`/learn/${item.courseId}`} pill>Start</LinkButton>;
    case 'IN_PROGRESS':
      return <LinkButton href={`/learn/${item.courseId}`} pill>Continue</LinkButton>;
    default:
      return <LinkButton href={page} variant="soft" pill>View</LinkButton>;
  }
}

export default async function EnrollmentsPage() {
  const res = await serverApi<{ data: MyCourseItem[]; summary: { unpaidCount: number; amountDue: number } }>('/me/enrollments');
  const items = res?.data ?? [];

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>Enrollments</h1>
        {res && res.summary.amountDue > 0 && (
          <span className="rounded-full bg-accent-100 px-4 py-1.5 text-sm font-semibold text-accent-600">
            Awaiting payment: {formatPrice(res.summary.amountDue)}
          </span>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {items.length === 0 ? (
          <EmptyState
            title="You have not enrolled in any course yet"
            text="Courses you enroll in will be listed here with their payment status."
            action={<LinkButton href="/courses" pill>Explore courses</LinkButton>}
          />
        ) : (
          items.map((item) => (
            <article key={item.enrollmentId} className={`${card} flex flex-col gap-4 p-4 sm:flex-row sm:items-center`}>
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md bg-brand-50 sm:w-40">
                <CoursePicture pictureUrl={item.pictureUrl} sizes="160px" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-brand-800">{item.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <StatusChip kind={LABEL[item.state].chip}>{LABEL[item.state].text}</StatusChip>
                  <span className="text-sm text-brand-500">{formatPrice(item.price)}</span>
                  {item.state === 'IN_PROGRESS' && <span className="text-sm text-brand-500">{item.progress}% complete</span>}
                </div>
              </div>
              <Action item={item} />
            </article>
          ))
        )}
      </div>
    </section>
  );
}
