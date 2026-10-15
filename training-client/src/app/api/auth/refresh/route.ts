import { NextRequest, NextResponse } from 'next/server';
import { safeNext } from '@/lib/url';

/**
 * Session refresh, handled by Next so it works for BOTH callers:
 *  - POST: the browser client (lib/api.ts) after a 401.
 *  - GET ?next=/path: server-rendered pages that found no valid access token.
 *    Refreshes, sets new cookies, then redirects back to `next` (or to /login on failure).
 *
 * The refresh cookie is scoped to /api/auth (backend REFRESH_COOKIE_PATH), so only
 * requests under /api/auth, like this one, ever carry it.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const REFRESH_COOKIE_PATH = '/api/auth';

async function refreshWithBackend(req: NextRequest): Promise<Response | null> {
  const token = req.cookies.get('refresh_token')?.value;
  if (!token) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: `refresh_token=${token}`,
  };
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers,
      body: '{}',
      cache: 'no-store',
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** Pass the backend's rotated cookies straight through to the browser. */
function copyCookies(from: Response, to: NextResponse) {
  for (const cookie of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', cookie);
  }
}

function clearSession(res: NextResponse) {
  res.cookies.set('access_token', '', { path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { path: REFRESH_COOKIE_PATH, maxAge: 0 });
}

export async function POST(req: NextRequest) {
  const upstream = await refreshWithBackend(req);
  if (!upstream) {
    const res = NextResponse.json({ message: 'Session expired' }, { status: 401 });
    clearSession(res);
    return res;
  }
  const { user } = await upstream.json();
  const res = NextResponse.json({ user }); // tokens stay in httpOnly cookies, not in the body
  copyCookies(upstream, res);
  return res;
}

export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  const upstream = await refreshWithBackend(req);

  if (!upstream) {
    const res = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
    clearSession(res);
    return res;
  }
  const res = NextResponse.redirect(new URL(next, req.url));
  copyCookies(upstream, res);
  return res;
}
