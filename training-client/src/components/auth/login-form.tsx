'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { validateEmail } from '@/lib/validation';
import GoogleButton from './google-button';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields';

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = {
      email: validateEmail(email),
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(found);
    setFormError(null);
    if (found.email || found.password) return;

    setLoading(true);
    try {
      await apiFetch('/auth/login', { method: 'POST', json: { email, password }, skipRefresh: true });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={loading}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
          labelAside={
            <Link href="/forgot-password" className="text-sm font-semibold text-navy-800 hover:underline">
              Forgot password?
            </Link>
          }
        />
        <SubmitButton loading={loading} loadingText="Logging in…">
          Log in
        </SubmitButton>
      </form>
      <div className="mt-4">
        <GoogleButton label="Sign up with Google" />
      </div>
    </>
  );
}
