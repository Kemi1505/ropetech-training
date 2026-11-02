import { redirect } from 'next/navigation';
import { Footer } from '@/components/footer';
import AdminShell from '@/components/layout/admin-shell';
import LearnerHeader from '@/components/layout/learner-header';
import { getSession } from '@/lib/session';
import { tryApi } from '@/lib/viewer';

/**
 * Everything after login. Learners get the top header and footer; admins and superadmins get the sidebar.
 * A logged-in person without a profile is sent to complete it first.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/api/auth/refresh?next=/dashboard');
  if (!session.profile) redirect('/complete-profile');

  const { user, profile } = session;
  const fullName = `${profile.firstName} ${profile.lastName}`;

  if (user.role !== 'USER') {
    return (
      <AdminShell name={fullName} role={user.role}>
        {children}
      </AdminShell>
    );
  }

  const [enrollments, unread] = await Promise.all([
    tryApi<{ summary: { unpaidCount: number } }>('/me/enrollments'),
    tryApi<{ unreadCount: number }>('/notifications/unread-count'),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <LearnerHeader
        firstName={profile.firstName}
        fullName={fullName}
        unpaidCount={enrollments?.summary.unpaidCount ?? 0}
        unreadCount={unread?.unreadCount ?? 0}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
