/** Build "?a=1&b=2" from an object, skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const pageOf = (raw?: string) => Math.max(1, Number.parseInt(raw ?? '1', 10) || 1);
