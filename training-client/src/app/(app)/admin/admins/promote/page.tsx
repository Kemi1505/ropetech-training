import type { Metadata } from 'next';
import { ConfirmButton } from '@/components/admin/admin-actions';
import EmptyState from '@/components/courses/empty-state';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import { AdminUserRow, Paged } from '@/lib/app-types';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Promote admin' };

export default async function PromoteAdminPage() {
  const list = await serverApi<Paged<AdminUserRow>>('/admin/admins?limit=100');
  const admins = (list?.data ?? []).filter((a) => a.role === 'ADMIN');

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-800">Promote admin</h1>
      <p className="mt-2 text-brand-500">An admin can be promoted to superadmin. This is the only role change allowed and it cannot be undone.</p>
      <div className="mt-6">
        {admins.length === 0 ? (
          <EmptyState title="No admins to promote" text="Create an admin first." />
        ) : (
          <Table head={['Admin', '']}>
            {admins.map((a) => (
              <tr key={a.id}>
                <Td><TwoLine main={a.firstName ? `${a.firstName} ${a.lastName}` : 'Name not added yet'} sub={a.email} /></Td>
                <Td className="text-right">
                  <ConfirmButton
                    label="Promote"
                    title="Promote to superadmin?"
                    message={`${a.email} will get full superadmin access, including creating, promoting and removing admins. This cannot be undone.`}
                    confirmLabel="Promote"
                    method="PATCH"
                    path={`/admin/admins/${a.id}/promote`}
                    variant="soft"
                    small
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
