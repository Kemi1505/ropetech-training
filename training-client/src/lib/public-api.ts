const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Server-side GET for public endpoints (no login needed), such as the course list.
 * Returns null on 404 and throws on any other failure, so the nearest error.tsx can show a retry.
 */
export async function publicApi<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return (await res.json()) as T;
}
