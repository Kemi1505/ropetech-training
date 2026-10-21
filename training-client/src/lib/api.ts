/**
 * Browser-side API client.
 *  - Calls go to /api/* on this origin (proxied to NestJS), cookies are sent automatically.
 *  - On a 401 it refreshes the session once, then retries the original request.
 *  - Parallel 401s share ONE refresh call, because refresh tokens are single-use (rotated).
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiInit = Omit<RequestInit, 'body'> & {
  json?: unknown;
  /** Skip the refresh-and-retry on 401. Use for login, signup and logout. */
  skipRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function extractMessage(data: unknown): string | undefined {
  // Some APIs return the error message as plain text.
  if (typeof data === 'string') {
    const text = data.trim();
    return text || undefined;
  }

  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const body = data as Record<string, unknown>;

  // Common backend formats: { message: "..." } or { message: ["...", "..."] }
  const message = body.message;

  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const messages = message.filter(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    );

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  // Support APIs that use { detail: "..." } instead.
  if (typeof body.detail === 'string' && body.detail.trim()) {
    return body.detail.trim();
  }

  return undefined;
}


export async function apiFetch<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, skipRefresh, headers, ...rest } = init;

  const send = () => {
    const h = new Headers(headers);
    if (json !== undefined) h.set('Content-Type', 'application/json');
    return fetch(`/api${path}`, {
      ...rest,
      headers: h,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      credentials: 'same-origin',
    });
  };

  let res = await send();

  if (res.status === 401 && !skipRefresh) {
    if (await refreshSession()) {
      res = await send();
    } else {
      if (typeof window !== 'undefined') window.location.assign('/login');
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }
  }

  
  const responseText = await res.text();

  let data: unknown = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      // The backend may return plain text instead of JSON.
      data = responseText;
    }
  }

  
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    // Avoid displaying a long HTML error page to the user.
    await res.text().catch(() => '');
  }

  if (!res.ok) {
    const message =
      extractMessage(data) ??
      (res.status === 404
        ? 'The requested resource was not found.'
        : res.status >= 500
          ? 'Something went wrong on our side. Please try again.'
          : 'Something went wrong. Please try again.');

    throw new ApiError(res.status, message);
  }

  if (!responseText) {
    return undefined as T;
  }

  return data as T;

}

/** A message that is safe to show to the user. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (err.status >= 500) return 'Something went wrong on our side. Please try again.';
    return err.message;
  }
  if (err instanceof TypeError) return 'Cannot reach the server. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}
