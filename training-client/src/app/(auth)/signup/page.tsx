import type { Metadata } from 'next';
import Link from 'next/link';
import SignupForm from '@/components/auth/signup-form';
import Logo  from '@/components/logo';

export const metadata: Metadata = {
  title: 'Create account',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-brand-800">
            Create your account
          </h1>

          <p className="mt-1 text-sm text-brand-500">
            Start your training journey today.
          </p>

          <div className="mt-8">
            <SignupForm />
          </div>

          <p className="mt-6 text-center text-sm text-brand-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:text-brand-500"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}