'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { apiFetch } from './api';

export function useLogout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST', skipRefresh: true });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  return { logout, loading };
}
