import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { Profile, User } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const REFRESH = '/api/auth/refresh?next=/dashboard';

export interface Session {
  user: User;
  profile: Profile | null; // null = profile not completed yet
}

/**
 * Server-side session. Cached per request, so layouts and pages share one lookup.
 * null = not logged in (missing/expired access token).
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  let me: Response, profile: Response;
  try {
    [me, profile] = await Promise.all([
      fetch(`${API_URL}/auth/me`, { headers, cache: 'no-store' }),
      fetch(`${API_URL}/profile`, { headers, cache: 'no-store' }),
    ]);
  } catch {
    return null; // API unreachable: the refresh route fails too and lands on /login
  }

  if (me.status === 401) return null;
  if (!me.ok) throw new Error(`/auth/me failed with ${me.status}`);
  const user = (await me.json()) as User;

  if (profile.status === 404) return { user, profile: null };
  if (profile.status === 401) return null;
  if (!profile.ok) throw new Error(`/profile failed with ${profile.status}`); // error page, not a redirect loop
  return { user, profile: (await profile.json()) as Profile };
});

/** Authenticated GET from a server component. 401 -> refresh, 404 -> null. */
export async function serverApi<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect(REFRESH);

  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) redirect(REFRESH);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return (await res.json()) as T;
}