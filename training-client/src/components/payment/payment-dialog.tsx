'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { CheckIcon, ClockIcon } from '@/components/icons';
import StatusChip from '@/components/courses/status-chip';
import Dialog from '@/components/ui/dialog';
import { Alert, Field } from '@/components/ui/form';
import { inputClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { PaymentInfo, PaymentSubmission } from '@/lib/app-types';
import { formatDateTime } from '@/lib/dates';
import { formatPrice } from '@/lib/format';

type View = 'details' | 'submit' | 'status';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * The payment dialog, opened from the course page with ?pay=details | submit | status.
 * Details: where to send the money. Submit: the name on the transfer and the amount. Status: what happens next.
 */
export default function PaymentDialog({ info, initialView }: { info: PaymentInfo; initialView: View }) {
  const router = useRouter();
  const pathname = usePathname();

  const [view, setView] = useState<View>(initialView);
  const [open, setOpen] = useState(true);
  const [submission, setSubmission] = useState<PaymentSubmission | null>(info.submission);
  const [paymentStatus, setPaymentStatus] = useState(info.paymentStatus);
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState(String(info.amountDue));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = paymentStatus === 'UNPAID' || paymentStatus === 'REJECTED';

  function close() {
    setOpen(false);
    router.replace(pathname); // removes ?pay=... from the address
    router.refresh(); // so the access card shows the new state
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const sent = Number(amount.replace(/,/g, ''));
    if (payerName.trim().length < 2) return setError('Enter the name on the account you sent from.');
    if (!Number.isFinite(sent) || sent <= 0) return setError('Enter the amount you sent.');

    setLoading(true);
    try {
      const res = await apiFetch<{ submission: PaymentSubmission }>(`/courses/${info.course.id}/payment`, {
        method: 'POST',
        json: { payerName: payerName.trim(), amountSent: sent },
      });
      setSubmission(res.submission);
      setPaymentStatus('PENDING');
      setView('status');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const title = view === 'details' ? 'Pay for this course' : view === 'submit' ? 'Submit your payment' : 'Payment status';

  return (
    <Dialog open={open} onClose={close} title={title}>
      <p className="-mt-2 mb-4 text-sm text-brand-500">{info.course.name}</p>

      {view === 'details' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Amount due</p>
          <p className="mt-1 text-3xl font-bold text-brand-800">{formatPrice(info.amountDue)}</p>

          <dl className="mt-5 space-y-3 rounded-lg bg-surface-alt p-4">
            {[
              ['Bank', info.bank.bankName],
              ['Account number', info.bank.accountNumber],
              ['Account name', info.bank.accountName],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <div>
                  <dt className="text-xs font-medium text-brand-500">{k}</dt>
                  <dd className="font-semibold text-black">{v}</dd>
                </div>
                {k !== 'Bank' && <CopyButton text={v} label={k} />}
              </div>
            ))}
          </dl>

          <ol className="mt-5 space-y-3">
            {info.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-black">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>

          <div className="mt-6 space-y-3">
            {canSubmit ? (
              <Button pill className="w-full py-3" onClick={() => setView('submit')}>
                I have paid, submit payment
              </Button>
            ) : (
              <Button pill className="w-full py-3" onClick={() => setView('status')}>
                View payment status
              </Button>
            )}
            <Button variant="soft" pill className="w-full py-3" onClick={close}>
              Close
            </Button>
          </div>
        </div>
      )}

      {view === 'submit' && (
        <form onSubmit={submit} noValidate className="space-y-4">
          <p className="text-sm text-brand-500">Tell us about the transfer you made.</p>
          {error && <Alert>{error}</Alert>}
          <Field label="Name on the transfer">
            <input className={inputClass} value={payerName} onChange={(e) => setPayerName(e.target.value)} autoComplete="name" disabled={loading} />
          </Field>
          <Field label="Amount sent (₦)" hint="Enter the amount you actually sent.">
            <input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" disabled={loading} />
          </Field>
          <div className="space-y-3 pt-2">
            <Button type="submit" pill className="w-full py-3" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit payment'}
            </Button>
            <Button type="button" variant="soft" pill className="w-full py-3" onClick={() => setView('details')} disabled={loading}>
              Back
            </Button>
          </div>
        </form>
      )}

      {view === 'status' && (
        <div>
          {paymentStatus === 'APPROVED' ? (
            <p className="flex items-center gap-2 font-semibold text-green-700">
              <CheckIcon className="size-5" /> Payment approved. The course is unlocked.
            </p>
          ) : paymentStatus === 'REJECTED' ? (
            <p className="font-semibold text-red-600">Your payment was not approved.</p>
          ) : (
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                <ClockIcon className="size-5" />
              </span>
              <p className="font-semibold text-brand-800">Thank you. An admin will approve your payment soon.</p>
            </div>
          )}

          {submission && (
            <dl className="mt-5 space-y-2.5 rounded-lg bg-surface-alt p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-brand-500">Name on transfer</dt><dd className="font-medium">{submission.payerName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-brand-500">Amount sent</dt><dd className="font-medium">{formatPrice(submission.amountSent)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-brand-500">Submitted</dt><dd className="font-medium">{formatDateTime(submission.submittedAt)}</dd></div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-brand-500">Status</dt>
                <dd>
                  <StatusChip kind={submission.status === 'APPROVED' ? 'done' : submission.status === 'REJECTED' ? 'rejected' : 'pending'}>
                    {submission.status === 'PENDING' ? 'Payment pending' : submission.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </StatusChip>
                </dd>
              </div>
              {submission.status === 'REJECTED' && submission.rejectionReason && (
                <div className="border-t border-brand-100 pt-2.5"><dt className="text-brand-500">Reason</dt><dd className="mt-1 font-medium text-red-600">{submission.rejectionReason}</dd></div>
              )}
            </dl>
          )}

          <p className="mt-4 text-xs text-brand-500">You will also get an email when it is approved or rejected.</p>
          <div className="mt-5 space-y-3">
            {paymentStatus === 'REJECTED' && (
              <Button variant="accent" pill className="w-full py-3" onClick={() => setView('submit')}>
                Submit payment again
              </Button>
            )}
            <Button pill className="w-full py-3" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
