'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import Dialog from '@/components/ui/dialog';
import { Alert, Field } from '@/components/ui/form';
import { textareaClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';

type Variant = 'primary' | 'soft' | 'accent' | 'outline';

/** A button that asks "are you sure?", then calls the API and refreshes the page. */
export function ConfirmButton({
  label,
  title,
  message,
  confirmLabel,
  method,
  path,
  variant = 'primary',
  danger,
  small,
  onDone,
}: {
  label: string;
  title: string;
  message: string;
  confirmLabel: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  variant?: Variant;
  danger?: boolean;
  small?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(path, { method });
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant={variant} pill className={small ? 'px-4 py-1.5' : ''} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-black">{message}</p>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        <div className="mt-6 flex gap-3">
          <Button variant="soft" pill className="flex-1 py-2.5" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className={`flex-1 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-brand-700 hover:bg-brand-600'}`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </Dialog>
    </>
  );
}

/** A button that asks for a reason, then sends it to the API (used for Reject). */
export function ReasonButton({
  label,
  title,
  description,
  path,
  required,
  small,
}: {
  label: string;
  title: string;
  description: string;
  path: string;
  required?: boolean;
  small?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (required && reason.trim().length < 3) return setError('Please give a reason (at least 3 characters).');
    setLoading(true);
    try {
      await apiFetch(path, { method: 'POST', json: { reason: reason.trim() || undefined } });
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="soft" pill className={small ? 'px-4 py-1.5' : ''} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="text-sm text-brand-500">{description}</p>
          {error && <Alert>{error}</Alert>}
          <Field label={required ? 'Reason' : 'Reason (optional)'}>
            <textarea className={textareaClass} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} disabled={loading} />
          </Field>
          <div className="flex gap-3">
            <Button type="button" variant="soft" pill className="flex-1 py-2.5" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
              {loading ? 'Working…' : label}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
