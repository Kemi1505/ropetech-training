import type { Metadata } from 'next';
import { ConfirmButton, ReasonButton } from '@/components/admin/admin-actions';
import EmptyState from '@/components/courses/empty-state';
import StatusChip from '@/components/courses/status-chip';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import LinkTabs from '@/components/ui/link-tabs';
import Pagination from '@/components/ui/pagination';
import { AdminCertificationRow, Paged } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';
import { apiUrl } from '@/lib/format';
import { pageOf, qs } from '@/lib/query';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Certifications' };

export default async function AdminCertificationsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(sp.status ?? '') ? sp.status! : 'PENDING';
  const page = pageOf(sp.page);

  const [list, counts] = await Promise.all([
    serverApi<Paged<AdminCertificationRow>>(`/admin/certifications${qs({ status, page, limit: 15 })}`),
    serverApi<{ pending: number; approved: number; rejected: number }>('/admin/certifications/counts'),
  ]);
  const rows = list?.data ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-800">Certifications</h1>
      <p className="mt-2 text-brand-500">Previous certifications uploaded by learners.</p>

      <div className="mt-6">
        <LinkTabs
          items={[
            { label: 'Pending', href: '/admin/certifications?status=PENDING', active: status === 'PENDING', count: counts?.pending },
            { label: 'Approved', href: '/admin/certifications?status=APPROVED', active: status === 'APPROVED', count: counts?.approved },
            { label: 'Rejected', href: '/admin/certifications?status=REJECTED', active: status === 'REJECTED', count: counts?.rejected },
          ]}
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title={status === 'PENDING' ? 'No pending certifications' : 'Nothing here yet'} />
        ) : (
          <>
            <Table head={['Learner', 'Company', 'Submitted', '']}>
              {rows.map((c) => (
                <tr key={c.userId}>
                  <Td><TwoLine main={c.name} sub={c.email} /></Td>
                  <Td>{c.company ?? '-'}</Td>
                  <Td className="text-brand-500">{formatDate(c.submittedAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={apiUrl(c.fileUrl)} target="_blank" rel="noreferrer" className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100">
                        View file
                      </a>
                      {status === 'PENDING' && (
                        <>
                          <ConfirmButton
                            label="Approve"
                            title="Approve this certification?"
                            message={`${c.name} will be able to enroll in courses that require a previous certification.`}
                            confirmLabel="Approve"
                            method="POST"
                            path={`/admin/users/${c.userId}/approve-certification`}
                            small
                          />
                          <ReasonButton label="Reject" title="Reject this certification" description="The learner is emailed and notified, and can upload a new file." path={`/admin/users/${c.userId}/reject-certification`} required small />
                        </>
                      )}
                      {status === 'REJECTED' && <StatusChip kind="rejected">Rejected</StatusChip>}
                      {status === 'APPROVED' && <StatusChip kind="done">Approved</StatusChip>}
                    </div>
                    {c.rejectionReason && <p className="mt-1.5 text-xs text-brand-500">Reason: {c.rejectionReason}</p>}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination page={list!.meta.page} totalPages={list!.meta.totalPages} total={list!.meta.total} hrefFor={(n) => `/admin/certifications${qs({ status, page: n })}`} />
          </>
        )}
      </div>
    </div>
  );
}
