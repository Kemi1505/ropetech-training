import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/shell/admin-sidebar';
import UserHeader, { Person } from '@/components/shell/user-header';
import { getSession } from '@/lib/session';
import { apiUrl } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/api/auth/refresh?next=/dashboard');
  if (!session.profile) redirect('/complete-profile'); // everyone completes their profile first

  const { user, profile } = session;
  const person: Person = {
    fullName: `${profile.firstName} ${profile.lastName}`,
    firstName: profile.firstName,
    email: user.email,
    pictureUrl: profile.pictureUrl ? apiUrl(profile.pictureUrl) : null,
  };

  // Learners get a top header, admins and superadmins get a sidebar
  if (user.role === 'USER') {
    return (
      <div className="min-h-dvh">
        <UserHeader person={person} />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
      </div>
    );
  }
  return (
    <div className="min-h-dvh">
      <AdminSidebar person={person} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
