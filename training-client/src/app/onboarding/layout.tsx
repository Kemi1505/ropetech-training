import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LogoutButton from '@/components/logout-button';
import Logo from '@/components/logo';


export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) redirect('/api/auth/refresh?next=/complete-profile');
  if (session.profile) redirect('/dashboard');

  return <>
  {children}</>;
}

