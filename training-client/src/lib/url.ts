/** Only allow same-site relative paths as redirect targets (prevents open redirects). */
export function safeNext(next?: string | null, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
