import { redirect } from 'next/navigation';
import LogoutButton from '@/components/layout/logout-button';
import Logo from '@/components/logo';
import { getSession } from '@/lib/session';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/api/auth/refresh?next=/complete-profile');
  if (session.profile) redirect('/dashboard'); // already done

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6 py-12">{children}</main>
    </div>
  );
}
