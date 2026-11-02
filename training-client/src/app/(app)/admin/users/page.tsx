import type { Metadata } from 'next';
import Link from 'next/link';
import EmptyState from '@/components/courses/empty-state';
import StatusChip, { ChipKind } from '@/components/courses/status-chip';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import LinkTabs from '@/components/ui/link-tabs';
import Pagination from '@/components/ui/pagination';
import { inputClass } from '@/components/ui/styles';
import { AdminUserDetail, AdminUserRow, Paged } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';
import { pageOf, qs } from '@/lib/query';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Users' };

const CERT: Record<string, { kind: ChipKind; label: string }> = {
  NONE: { kind: 'draft', label: 'None' },
  PENDING: { kind: 'pending', label: 'Pending' },
  APPROVED: { kind: 'done', label: 'Approved' },
  REJECTED: { kind: 'rejected', label: 'Rejected' },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; certification?: string; page?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const search = (sp.search ?? '').trim();
  const certification = ['NONE', 'PENDING', 'APPROVED', 'REJECTED'].includes(sp.certification ?? '') ? sp.certification! : '';
  const page = pageOf(sp.page);

  const [list, selected] = await Promise.all([
    serverApi<Paged<AdminUserRow>>(`/admin/users${qs({ search, certification, page, limit: 10 })}`),
    sp.user ? serverApi<AdminUserDetail>(`/admin/users/${sp.user}`) : Promise.resolve(null),
  ]);
  const rows = list?.data ?? [];
  const base = { search, certification, page };
  const tab = (label: string, value: string) => ({ label, href: `/admin/users${qs({ search, certification: value })}`, active: certification === value });

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-800">Users</h1>
      <p className="mt-2 text-brand-500">{list?.meta.total ?? 0} learners</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <form action="/admin/users" method="get" role="search" className="flex w-full max-w-sm gap-2">
          {certification && <input type="hidden" name="certification" value={certification} />}
          <input name="search" defaultValue={search} placeholder="Search name or email" aria-label="Search users" className={inputClass} />
          <button type="submit" className="rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-600">Search</button>
        </form>
        <LinkTabs items={[tab('All', ''), tab('Cert. pending', 'PENDING'), tab('Cert. approved', 'APPROVED'), tab('Cert. rejected', 'REJECTED')]} />
      </div>

      <div className={`mt-6 grid gap-6 ${selected ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
        <div>
          {rows.length === 0 ? (
            <EmptyState title={search || certification ? 'No users match' : 'No users yet'} text={search || certification ? 'Try another search or filter.' : 'Learners will appear here after they sign up.'} />
          ) : (
            <>
              <Table head={['Name', 'Certification', 'Courses']}>
                {rows.map((u) => (
                  <tr key={u.id} className={u.id === sp.user ? 'bg-brand-50' : 'hover:bg-brand-50/50'}>
                    <Td>
                      <Link href={`/admin/users${qs({ ...base, user: u.id })}`} className="block">
                        <TwoLine main={u.firstName ? `${u.firstName} ${u.lastName}` : 'Profile not completed'} sub={u.email} />
                      </Link>
                    </Td>
                    <Td><StatusChip kind={CERT[u.certificationStatus].kind}>{CERT[u.certificationStatus].label}</StatusChip></Td>
                    <Td>{u.enrollments}</Td>
                  </tr>
                ))}
              </Table>
              <Pagination page={list!.meta.page} totalPages={list!.meta.totalPages} total={list!.meta.total} hrefFor={(p) => `/admin/users${qs({ search, certification, page: p })}`} />
            </>
          )}
        </div>

        {selected && (
          <aside className="h-fit rounded-lg bg-white p-6 shadow-md shadow-brand-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-brand-800">{selected.firstName ? `${selected.firstName} ${selected.lastName}` : 'Profile not completed'}</p>
                <p className="text-sm text-brand-500">{selected.email}</p>
              </div>
              <Link href={`/admin/users${qs({ search, certification, page })}`} className="text-sm font-semibold text-brand-700 hover:text-brand-500">Close</Link>
            </div>
            <dl className="mt-5 space-y-3 rounded-lg bg-surface-alt p-4 text-sm">
              {[
                ['Phone', selected.phone ?? '-'],
                ['Company', selected.company ?? '-'],
                ['Joined', formatDate(selected.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-brand-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-brand-500">Certification</dt>
                <dd><StatusChip kind={CERT[selected.certificationStatus].kind}>{CERT[selected.certificationStatus].label}</StatusChip></dd>
              </div>
            </dl>
            <h2 className="mt-6 text-sm font-semibold text-brand-800">Enrollments</h2>
            {selected.enrollments.length === 0 ? (
              <p className="mt-2 text-sm text-brand-500">Not enrolled in any course.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {selected.enrollments.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-alt px-3 py-2 text-sm">
                    <span className="truncate font-medium">{e.course.name}</span>
                    <StatusChip kind={e.paymentStatus === 'APPROVED' ? 'done' : e.paymentStatus === 'REJECTED' ? 'rejected' : e.paymentStatus === 'PENDING' ? 'pending' : 'draft'}>
                      {e.paymentStatus === 'APPROVED' ? 'Paid' : e.paymentStatus === 'PENDING' ? 'Pending' : e.paymentStatus === 'REJECTED' ? 'Rejected' : 'Not paid'}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
