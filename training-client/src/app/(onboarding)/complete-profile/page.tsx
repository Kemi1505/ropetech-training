import type { Metadata } from 'next';
import ProfileForm from '@/components/profile/profile-form';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Complete your profile' };

export default async function CompleteProfilePage() {
  const session = await getSession(); // the layout already guarantees one
  return (
    <div className="rounded-lg bg-white p-8 shadow-md shadow-brand-900/10 sm:p-10">
      <h1 className="text-2xl font-bold text-brand-800">Complete your profile</h1>
      <p className="mt-2 text-sm text-brand-500">A few details before you get started.</p>
      <div className="mt-8">
        <ProfileForm mode="complete" role={session?.user.role ?? 'USER'} />
      </div>
    </div>
  );
}
