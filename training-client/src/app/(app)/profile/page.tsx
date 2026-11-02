import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import StatusChip from '@/components/courses/status-chip';
import ProfileForm from '@/components/profile/profile-form';
import { h1 } from '@/components/ui/styles';
import { ProfileView } from '@/lib/app-types';
import { apiUrl } from '@/lib/format';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const profile = await serverApi<ProfileView>('/profile');
  if (!profile) notFound();

  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();
  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <h1 className={h1}>Profile</h1>

      <div className="mt-8 flex items-center gap-5">
        {profile.pictureUrl ? (
          <Image unoptimized src={apiUrl(profile.pictureUrl)} alt="" width={72} height={72} className="size-[72px] rounded-full object-cover" />
        ) : (
          <span className="flex size-[72px] items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">{initials}</span>
        )}
        <div>
          <p className="text-xl font-bold text-brand-800">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="text-sm text-brand-500">{profile.email}</p>
          <div className="mt-2">
            <StatusChip kind="neutral">{profile.role === 'USER' ? 'Learner' : profile.role === 'ADMIN' ? 'Admin' : 'Superadmin'}</StatusChip>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-white p-8 shadow-md shadow-brand-900/10">
        <ProfileForm mode="edit" role={profile.role} profile={profile} />
      </div>
    </section>
  );
}
