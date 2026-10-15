import type { Metadata } from 'next';
import Link from 'next/link';
import  Logo from '@/components/logo';
import ResetPasswordForm from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password',
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-brand-800">
            Reset your password
          </h1>

          <p className="mt-1 text-sm text-brand-500">
            Enter the 6-digit code in your email, and your new password.
          </p>

          <div className="mt-8">
            <ResetPasswordForm />
          </div>

          <p className="mt-6 text-center text-sm text-brand-500">
            Remembered your password?{' '}
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