import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.user.role !== 'SUPERADMIN') redirect('/dashboard');
  return children;
}
