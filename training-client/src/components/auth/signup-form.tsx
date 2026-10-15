'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError, apiFetch, getErrorMessage } from '@/lib/api';
import { validateEmail, validateNewPassword } from '@/lib/validation';
import GoogleButton from './google-button';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields';

type Errors = { email?: string; password?: string; confirmPassword?: string };

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Errors = {
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirmPassword: confirmPassword === password ? undefined : 'Passwords do not match.',
    };
    setErrors(found);
    setFormError(null);
    if (found.email || found.password || found.confirmPassword) return;

    setLoading(true);
    try {
      // Signing up also logs the user in (cookies are set by the response).
      await apiFetch('/auth/register', {
        method: 'POST',
        json: { email, password, confirmPassword },
        skipRefresh: true,
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: 'An account with this email already exists. Try logging in.' });
      } else {
        setFormError(getErrorMessage(err));
      }
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          disabled={loading}
        />
        <SubmitButton loading={loading} loadingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <div className="mt-4">
        <GoogleButton label="Sign up with Google" />
      </div>
    </>
  );
}
