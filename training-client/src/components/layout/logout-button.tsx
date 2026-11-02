'use client';

import { useLogout } from '@/lib/use-logout';

export default function LogoutButton() {
  const { logout, loading } = useLogout();
  return (
    <button type="button" onClick={logout} disabled={loading} className="text-sm font-semibold text-brand-700 hover:text-brand-500 disabled:opacity-50">
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}
