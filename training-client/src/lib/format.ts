/** Prices are plain numbers from the API. Change the currency here. */
export const CURRENCY = 'NGN';

export const formatPrice = (n: number) =>
  n === 0
    ? 'Free'
    : new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: CURRENCY,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));

/** API paths like /courses/:id/picture are served through the /api proxy */
export const apiUrl = (path: string) => `/api${path}`;

export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

