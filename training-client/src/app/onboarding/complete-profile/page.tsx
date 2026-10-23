import type { Metadata } from 'next';
import CompleteProfileForm from '@/components/onboarding/complete-profile-form';
import { getSession } from '@/lib/session';
import LogoutButton from '@/components/logout-button';
import Logo from '@/components/logo';

export const metadata: Metadata = { title: 'Complete your profile' };

export default async function CompleteProfilePage() {
  const session = await getSession(); // the layout already guarantees one

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="px-6 py-4">
        <Logo />
        <LogoutButton />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold text-brand-800">
            Complete your profile
          </h1>

          <p className="mt-1 text-sm text-brand-500">
            A few details before you get started.
          </p>

          <div className="mt-8">
            <CompleteProfileForm
              role={session?.user.role ?? 'USER'}
            />
          </div>
        </div>
      </main>
    </div>
  );

}
