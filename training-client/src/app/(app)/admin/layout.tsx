import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

// Everything under /admin is for admins and superadmins (the API enforces it too)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role === 'USER') redirect('/dashboard');
  return children;
}
