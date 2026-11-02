'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { Alert, Field } from '@/components/ui/form';
import { inputClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';

export default function CreateAdminForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6 ) {
      return setError('The temporary password needs 6 characters or more.');
    }
    if (password.length > 72 ) {
      return setError('The temporary password canot be greater than 72 characters');
    }
    setLoading(true);
    try {
      await apiFetch('/admin/admins', { method: 'POST', json: { email: email.trim(), password } });
      setDone(`Admin created. Share the email and temporary password with ${email.trim()}. They will enter their name when they first log in.`);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <Alert>{error}</Alert>}
      {done && <Alert kind="success">{done}</Alert>}
      <Field label="Email">
        <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" disabled={loading} />
      </Field>
      <Field label="Temporary password" hint="The admin can change it after they log in.">
        <input className={inputClass} type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" disabled={loading} />
      </Field>
      <Button type="submit" pill className="w-full py-3" disabled={loading}>
        {loading ? 'Creating…' : 'Create admin'}
      </Button>
    </form>
  );
}
