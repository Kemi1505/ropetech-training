'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch, getErrorMessage } from '@/lib/api';
import {
  validateEmail,
  validateNewPassword,
} from '@/lib/validation';
import {
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
} from './fields';

type Errors = {
  email?: string;
  otp?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const found: Errors = {
      email: validateEmail(email),
      otp: /^\d{6}$/.test(otp)
        ? undefined
        : 'Enter the 6-digit code sent to your email.',
      newPassword: validateNewPassword(newPassword),
      confirmPassword:
        confirmPassword === newPassword
          ? undefined
          : 'Passwords do not match.',
    };

    setErrors(found);
    setFormError(null);

    if (
      found.email ||
      found.otp ||
      found.newPassword ||
      found.confirmPassword
    ) {
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        json: {
          email,
          otp,
          newPassword,
          confirmPassword,
        },
        skipRefresh: true,
      });

      setSuccess(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-md border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800"
        >
          Your Password has been Reset successfully. You can now Log in
          with your New Password.
        </div>

        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-md bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Go to log in
        </Link>
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
        error={errors.email}
        disabled={loading}
      />

      <TextField
        label="6-digit reset code"
        type="text"
        name="otp"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(e) =>
          setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
        }
        error={errors.otp}
        disabled={loading}
      />

      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={errors.newPassword}
        disabled={loading}
      />

      <PasswordField
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
        disabled={loading}
      />

      <SubmitButton loading={loading} loadingText="Resetting password…">
        Reset password
      </SubmitButton>
    </form>
  );
}