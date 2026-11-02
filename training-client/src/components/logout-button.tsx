'use client';

import { useLogout } from "@/lib/use-logout";

export default function LogoutButton() {
  const { logout, loading } = useLogout();
  return (
    <button
      onClick={logout}
      disabled={loading}
      className="h-11 rounded-sm border border-line bg-white px-5 text-base font-semibold text-navy-900 hover:bg-surface disabled:opacity-60"
    >
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  );
}