import type { Metadata } from 'next';
import Link from 'next/link';
import  Logo from '@/components/logo';
import LoginForm from '@/components/auth/login-form';
import { safeNext } from '@/lib/url';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-brand-800">
            Log In
          </h1>

          <p className="mt-1 text-sm text-brand-500">
            Welcome back, enter your details below to continue.
          </p>

          <div className="mt-8">
            <LoginForm next={safeNext(next)} />
          </div>

          <p className="mt-6 text-center text-sm text-brand-500">
            New to Ropetech?{' '}
            <Link
              href="/signup"
              className="font-semibold text-brand-700 hover:text-brand-500"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}