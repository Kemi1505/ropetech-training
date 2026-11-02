import type { Metadata } from 'next';
import { LinkButton } from '@/components/button';
import { ConfirmButton } from '@/components/admin/admin-actions';
import EmptyState from '@/components/courses/empty-state';
import StatusChip from '@/components/courses/status-chip';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import Pagination from '@/components/ui/pagination';
import { AdminUserRow, Paged } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';
import { pageOf, qs } from '@/lib/query';
import { getSession, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'All admins' };

export default async function AdminsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageOf((await searchParams).page);
  const [session, list] = await Promise.all([getSession(), serverApi<Paged<AdminUserRow>>(`/admin/admins${qs({ page, limit: 20 })}`)]);
  const rows = list?.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-brand-800">All admins</h1>
        <LinkButton href="/admin/admins/create" pill className="px-6">+ Create admin</LinkButton>
      </div>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No admins yet" />
        ) : (
          <>
            <Table head={['Admin', 'Role', 'Created', '']}>
              {rows.map((a) => (
                <tr key={a.id}>
                  <Td><TwoLine main={a.firstName ? `${a.firstName} ${a.lastName}` : 'Name not added yet'} sub={a.email} /></Td>
                  <Td><StatusChip kind={a.role === 'SUPERADMIN' ? 'ready' : 'neutral'}>{a.role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}</StatusChip></Td>
                  <Td className="text-brand-500">{formatDate(a.createdAt)}</Td>
                  <Td className="text-right">
                    {a.role === 'ADMIN' && a.id !== session?.user.id && (
                      <ConfirmButton
                        label="Deactivate"
                        title="Deactivate this admin?"
                        message={`This permanently deletes the account of ${a.email}. It cannot be undone.`}
                        confirmLabel="Deactivate and delete"
                        method="DELETE"
                        path={`/admin/admins/${a.id}`}
                        variant="soft"
                        danger
                        small
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination page={list!.meta.page} totalPages={list!.meta.totalPages} total={list!.meta.total} hrefFor={(p) => `/admin/admins${qs({ page: p })}`} />
          </>
        )}
      </div>
    </div>
  );
}
