import { cookies } from 'next/headers';
import type { User } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/** Server-side: the logged-in user, or null if the access token is missing/expired/invalid. */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as User) : null;
  } catch {
    return null;
  }
}
