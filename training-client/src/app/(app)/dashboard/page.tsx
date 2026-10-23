import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import LogoutButton from '@/components/logout-button';
//import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

// Placeholder page to prove the whole auth + SSR refresh flow works. Replace later.
export default async function DashboardPage() {
  //const user = await getCurrentUser();

  // No valid access token: try the refresh token once, then come back here (or land on /login).
  //if (!user) redirect('/api/auth/refresh?next=/dashboard');

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Logo tone="dark" />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-14">
        <h1 className="font-display text-5xl font-bold uppercase tracking-wide">Dashboard</h1>
        <p className="mt-4 text-lg text-muted">
          Hello I am testing
         
        </p>
      </main>
    </div>
  );
}
