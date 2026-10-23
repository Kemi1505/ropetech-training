// 'use client';

// import { useRouter } from 'next/navigation';
// import { useState } from 'react';
// import { apiFetch } from '@/lib/api';

// export default function LogoutButton() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);

//   async function logout() {
//     setLoading(true);
//     try {
//       await apiFetch('/auth/logout', { method: 'POST', skipRefresh: true });
//     } finally {
//       router.replace('/login');
//       router.refresh();
//     }
//   }

//   return (
//     <button
//       onClick={logout}
//       disabled={loading}
//       className="h-11 rounded-sm border border-line bg-white px-5 text-base font-semibold text-navy-900 hover:bg-surface disabled:opacity-60"
//     >
//       {loading ? 'Logging out…' : 'Log out'}
//     </button>
//   );
// }


'use client';

import { useLogout } from '@/lib/use-logout';

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