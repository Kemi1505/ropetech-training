import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  // The browser only ever talks to this app. /api/* is forwarded to NestJS, so auth cookies
  // are set on this origin: no CORS, and SameSite=Lax just works.
  // (src/app/api/auth/refresh/route.ts is a real route and wins over this rewrite.)
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;

