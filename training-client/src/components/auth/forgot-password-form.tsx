'use client';

import { useState, type FormEvent } from 'react';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { validateEmail } from '@/lib/validation';
import { FormAlert, SubmitButton, TextField } from './fields';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const emailError = validateEmail(email);
    setError(emailError);
    setFormError(null);

    if (emailError) return;

    setLoading(true);

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        json: { email },
        skipRefresh: true,
      });

      setSubmitted(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-md border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800"
        >
          If an Account Exists with this Email, Check your Inbox for a Reset Code.
        </div>

        <a
          href="/reset-password"
          className="flex h-12 w-full items-center justify-center rounded-md bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Enter reset code
        </a>
      </div>
    );
  }

  return (
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
        error={error}
        disabled={loading}
      />

      <SubmitButton loading={loading} loadingText="Sending reset code…">
        Send Reset Code
      </SubmitButton>
    </form>
  );
}