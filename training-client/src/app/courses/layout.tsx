import { redirect } from 'next/navigation';
import { Footer } from '@/components/footer';
import LearnerHeader from '@/components/layout/learner-header';
import PublicHeader from '@/components/layout/public-header';
import { getSession } from '@/lib/session';
import { tryApi } from '@/lib/viewer';

/**
 * Courses are public, but a logged-in learner gets their own header (cart, bell, profile menu).
 * Each page checks for an expired login itself, so this layout only reads the session.
 */
export default async function CoursesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (session && !session.profile) redirect('/complete-profile');
  if (session && session.user.role !== 'USER') redirect('/dashboard'); // admins manage courses elsewhere

  let header = <PublicHeader active="courses" />;
  if (session?.profile) {
    const [enrollments, unread] = await Promise.all([
      tryApi<{ summary: { unpaidCount: number } }>('/me/enrollments'),
      tryApi<{ unreadCount: number }>('/notifications/unread-count'),
    ]);
    header = (
      <LearnerHeader
        firstName={session.profile.firstName}
        fullName={`${session.profile.firstName} ${session.profile.lastName}`}
        unpaidCount={enrollments?.summary.unpaidCount ?? 0}
        unreadCount={unread?.unreadCount ?? 0}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
