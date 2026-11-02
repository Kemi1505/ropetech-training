import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, Session } from './session';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Who is looking at this page? null = a visitor who is not logged in.
 *
 * If a login cookie exists but is no longer valid (the short-lived access token ran out), the learner is
 * still logged in: send them through the refresh route, which gets a new token and comes straight back.
 */
export async function getViewer(currentPath: string): Promise<Session | null> {
  const hadCookie = !!(await cookies()).get('access_token');
  const session = await getSession();
  if (!session && hadCookie) redirect(`/api/auth/refresh?next=${encodeURIComponent(currentPath)}`);
  return session;
}

/**
 * A logged-in GET whose failure must not break the page (header counters, the learner's course states).
 * Returns null on any problem. Unlike serverApi it never redirects.
 */
export async function tryApi<T>(path: string): Promise<T | null> {
  try {
    const token = (await cookies()).get('access_token')?.value;
    if (!token) return null;
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
