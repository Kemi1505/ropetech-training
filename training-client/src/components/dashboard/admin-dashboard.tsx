import Link from 'next/link';
import StatusChip, { ChipKind } from '@/components/courses/status-chip';
import { Table, Td } from '@/components/ui/data-table';
import { h2 } from '@/components/ui/styles';
import { AdminDashboard as Data } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';

const STATUS: Record<string, { kind: ChipKind; label: string }> = {
  ACTIVE: { kind: 'neutral', label: 'Active' },
  COMPLETED: { kind: 'done', label: 'Completed' },
  PAYMENT_PENDING: { kind: 'pending', label: 'Payment pending' },
  PAYMENT_REJECTED: { kind: 'rejected', label: 'Payment rejected' },
  NOT_PAID: { kind: 'draft', label: 'Not paid' },
};

function Stat({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-alt p-6">
      <p className="flex items-center gap-2 text-sm font-medium text-brand-500">
        {hot && value > 0 && <span className="size-2 rounded-full bg-accent-600" />}
        {label}
      </p>
      <p className={`mt-3 text-4xl font-bold ${hot && value > 0 ? 'text-accent-600' : 'text-brand-800'}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboardView({ data }: { data: Data }) {
  const { payments, certifications, drafts } = data.pendingActions;
  const actions = [
    { n: payments, text: `${payments} payment ${payments === 1 ? 'confirmation needs' : 'confirmations need'} review`, href: '/admin/payments?status=PENDING' },
    { n: certifications, text: `${certifications} previous ${certifications === 1 ? 'certification needs' : 'certifications need'} review`, href: '/admin/certifications?status=PENDING' },
    { n: drafts, text: `${drafts} new course ${drafts === 1 ? 'draft' : 'drafts'}`, href: '/admin/courses?status=DRAFT' },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-brand-800">Welcome, {data.adminName}</h1>
        <p className="mt-2 text-brand-500">Here is what is going on with your training platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Published courses" value={data.publishedCourses} />
        <Stat label="Unpublished courses" value={data.unpublishedCourses} />
        <Stat label="Total users" value={data.totalUsers} />
        <Stat label="Approved payments" value={data.approvedPayments} />
        <Stat label="Pending payments" value={data.pendingPayments} hot />
        <Stat label="Pending certifications" value={data.pendingCertifications} hot />
      </div>

      <section>
        <h2 className={h2}>Pending actions</h2>
        <div className="mt-4 rounded-lg bg-surface-alt">
          {actions.length === 0 ? (
            <p className="px-6 py-5 text-sm font-medium text-brand-800">No pending actions for now</p>
          ) : (
            <ul className="divide-y divide-white">
              {actions.map((a) => (
                <li key={a.href} className="flex items-center justify-between gap-4 px-6 py-4">
                  <span className="flex items-center gap-3 text-sm font-semibold text-black">
                    <span className="size-2 rounded-full bg-accent-600" />
                    {a.text}
                  </span>
                  <Link href={a.href} className="text-sm font-semibold text-brand-700 hover:text-brand-500">
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className={h2}>Recent enrollments</h2>
          <Link href="/admin/enrollments" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
            View all →
          </Link>
        </div>
        <div className="mt-4">
          {data.recentEnrollments.length === 0 ? (
            <p className="rounded-lg bg-surface-alt px-6 py-5 text-sm text-brand-500">No enrollments yet.</p>
          ) : (
            <Table head={['User', 'Course', 'Enrolled', 'Status']}>
              {data.recentEnrollments.map((e) => (
                <tr key={e.id}>
                  <Td className="font-semibold text-brand-800">{e.user}</Td>
                  <Td>{e.course}</Td>
                  <Td className="text-brand-500">{formatDate(e.enrolledAt)}</Td>
                  <Td>
                    <StatusChip kind={(STATUS[e.status] ?? STATUS.NOT_PAID).kind}>{(STATUS[e.status] ?? STATUS.NOT_PAID).label}</StatusChip>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
