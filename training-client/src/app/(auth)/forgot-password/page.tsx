import type { Metadata } from 'next';
import Link from 'next/link';
import  Logo from '@/components/logo';
import ForgotPasswordForm from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-brand-800">
            Forgot your password?
          </h1>

          <p className="mt-1 text-sm text-brand-500">
            Enter the email address associated with your account. We’ll
            send a reset code if an account exists.
          </p>

          <div className="mt-8">
            <ForgotPasswordForm />
          </div>

          <p className="mt-6 text-center text-sm text-brand-500">
            Remember your password?{' '}
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