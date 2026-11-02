import type { Metadata } from 'next';
import { ConfirmButton, ReasonButton } from '@/components/admin/admin-actions';
import EmptyState from '@/components/courses/empty-state';
import StatusChip from '@/components/courses/status-chip';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import LinkTabs from '@/components/ui/link-tabs';
import Pagination from '@/components/ui/pagination';
import { AdminPaymentRow, Paged } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';
import { formatPrice } from '@/lib/format';
import { pageOf, qs } from '@/lib/query';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Payments' };

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(sp.status ?? '') ? sp.status! : 'PENDING';
  const page = pageOf(sp.page);

  const [list, counts] = await Promise.all([
    serverApi<Paged<AdminPaymentRow>>(`/admin/payments${qs({ status, page, limit: 15 })}`),
    serverApi<{ pending: number; approved: number; rejected: number }>('/admin/payments/counts'),
  ]);
  const rows = list?.data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-800">Payments</h1>
      <p className="mt-2 text-brand-500">Check your bank account, then approve or reject.</p>

      <div className="mt-6">
        <LinkTabs
          items={[
            { label: 'Pending', href: '/admin/payments?status=PENDING', active: status === 'PENDING', count: counts?.pending },
            { label: 'Approved', href: '/admin/payments?status=APPROVED', active: status === 'APPROVED', count: counts?.approved },
            { label: 'Rejected', href: '/admin/payments?status=REJECTED', active: status === 'REJECTED', count: counts?.rejected },
          ]}
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title={status === 'PENDING' ? 'No payments waiting' : 'Nothing here yet'} text={status === 'PENDING' ? 'New payment submissions will show up here.' : undefined} />
        ) : (
          <>
            <Table head={['Learner', 'Course', 'Name on transfer', 'Amount sent', status === 'PENDING' ? '' : 'Result']}>
              {rows.map((p) => (
                <tr key={p.id}>
                  <Td><TwoLine main={p.user.name ?? p.user.email} sub={`Submitted ${formatDate(p.submittedAt)}`} /></Td>
                  <Td>{p.course.name}</Td>
                  <Td>{p.payerName}</Td>
                  <Td>
                    <TwoLine
                      main={formatPrice(p.amountSent)}
                      sub={p.amountMatches ? 'Matches the price' : <span className="font-semibold text-accent-600">Price is {formatPrice(p.expectedAmount)}</span>}
                    />
                  </Td>
                  <Td>
                    {p.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <ConfirmButton
                          label="Approve"
                          title="Approve this payment?"
                          message={`${formatPrice(p.amountSent)} from ${p.payerName} for ${p.course.name}. The learner gets access to the course.`}
                          confirmLabel="Approve"
                          method="POST"
                          path={`/admin/payments/${p.id}/approve`}
                          small
                        />
                        <ReasonButton label="Reject" title="Reject this payment" description="The learner is emailed and notified. They can submit again." path={`/admin/payments/${p.id}/reject`} small />
                      </div>
                    ) : (
                      <div>
                        <StatusChip kind={p.status === 'APPROVED' ? 'done' : 'rejected'}>{p.status === 'APPROVED' ? 'Approved' : 'Rejected'}</StatusChip>
                        {p.rejectionReason && <p className="mt-1 text-xs text-brand-500">{p.rejectionReason}</p>}
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination page={list!.meta.page} totalPages={list!.meta.totalPages} total={list!.meta.total} hrefFor={(n) => `/admin/payments${qs({ status, page: n })}`} />
          </>
        )}
      </div>
    </div>
  );
}
