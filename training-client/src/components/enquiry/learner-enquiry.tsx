'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { CheckIcon } from '@/components/icons';
import Dialog from '@/components/ui/dialog';
import { Alert, Field } from '@/components/ui/form';
import { textareaClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';

/** "Make an enquiry" for a logged-in learner: only the message; the server adds their name and email. */
export default function LearnerEnquiry({ label = 'Make an enquiry', variant = 'outline' }: { label?: string; variant?: 'outline' | 'primary' | 'soft' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    if (sent) {
      setSent(false);
      setText('');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (text.trim().length < 10) return setError('Please write at least 10 characters.');
    setLoading(true);
    try {
      await apiFetch('/enquiries', { method: 'POST', json: { text: text.trim() } });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant={variant} pill className="px-6" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={close} title="Make an enquiry">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CheckIcon className="size-7" />
            </span>
            <p className="mt-4 text-lg font-semibold text-brand-800">Thank you for reaching out</p>
            <p className="mt-1 text-sm text-brand-500">A response will be sent to your email soon.</p>
            <Button variant="soft" pill className="mt-6 w-full py-3" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            {error && <Alert>{error}</Alert>}
            <Field label="How can we help?">
              <textarea className={textareaClass} rows={5} value={text} onChange={(e) => setText(e.target.value)} disabled={loading} placeholder="Type your question here" />
            </Field>
            <Button type="submit" pill className="w-full py-3" disabled={loading}>
              {loading ? 'Sending…' : 'Send enquiry'}
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
