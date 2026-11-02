import type { Metadata } from 'next';
import EmptyState from '@/components/courses/empty-state';
import StatusChip, { ChipKind } from '@/components/courses/status-chip';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import Pagination from '@/components/ui/pagination';
import { inputClass } from '@/components/ui/styles';
import { AdminEnrollmentRow, Paged } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';
import { pageOf, qs } from '@/lib/query';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Enrollments' };

const PAYMENT: Record<string, { kind: ChipKind; label: string }> = {
  UNPAID: { kind: 'draft', label: 'Not paid' },
  PENDING: { kind: 'pending', label: 'Pending' },
  APPROVED: { kind: 'done', label: 'Approved' },
  REJECTED: { kind: 'rejected', label: 'Rejected' },
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; paymentStatus?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const search = (sp.search ?? '').trim();
  const paymentStatus = Object.keys(PAYMENT).includes(sp.paymentStatus ?? '') ? sp.paymentStatus! : '';
  const page = pageOf(sp.page);

  const list = await serverApi<Paged<AdminEnrollmentRow>>(`/admin/enrollments${qs({ search, paymentStatus, page, limit: 15 })}`);
  const rows = list?.data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-800">Enrollments</h1>
      <p className="mt-2 text-brand-500">{list?.meta.total ?? 0} enrollments</p>

      <form action="/admin/enrollments" method="get" role="search" className="mt-6 flex flex-wrap gap-3">
        <input name="search" defaultValue={search} placeholder="Search learner" aria-label="Search learner" className={`${inputClass} max-w-xs`} />
        <select name="paymentStatus" defaultValue={paymentStatus} aria-label="Payment status" className={`${inputClass} max-w-[11rem]`}>
          <option value="">Payment: all</option>
          {Object.entries(PAYMENT).map(([v, p]) => (
            <option key={v} value={v}>{p.label}</option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-brand-700 px-6 text-sm font-semibold text-white hover:bg-brand-600">Filter</button>
      </form>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No enrollments found" text={search || paymentStatus ? 'Try another search or filter.' : 'Enrollments appear here when learners enroll in a course.'} />
        ) : (
          <>
            <Table head={['Learner', 'Course', 'Enrolled', 'Payment', 'Progress']}>
              {rows.map((e) => (
                <tr key={e.id}>
                  <Td><TwoLine main={e.user.name ?? e.user.email} sub={e.user.name ? e.user.email : undefined} /></Td>
                  <Td>{e.course.name}</Td>
                  <Td className="text-brand-500">{formatDate(e.enrolledAt)}</Td>
                  <Td><StatusChip kind={PAYMENT[e.paymentStatus].kind}>{PAYMENT[e.paymentStatus].label}</StatusChip></Td>
                  <Td>{e.paymentStatus === 'APPROVED' ? `${e.progress}%` : '-'}</Td>
                </tr>
              ))}
            </Table>
            <Pagination page={list!.meta.page} totalPages={list!.meta.totalPages} total={list!.meta.total} hrefFor={(p) => `/admin/enrollments${qs({ search, paymentStatus, page: p })}`} />
          </>
        )}
      </div>
    </div>
  );
}
