'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { CloseIcon } from '@/components/icons';
import { Alert } from '@/components/ui/form';
import { inputClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';

/** Step 3: what learners will be able to do. Shown on the course page as boxes. */
export default function OutcomesStep({ courseId, initial }: { courseId: string; initial: string[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.length ? initial : ['']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (i: number, v: string) => setItems((list) => list.map((x, j) => (j === i ? v : x)));

  async function save() {
    const cleaned = items.map((x) => x.trim()).filter(Boolean);
    if (cleaned.length === 0) return setError('Add at least one learning outcome.');
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('learningOutcomes', JSON.stringify(cleaned)); // the API accepts a JSON list
      await apiFetch(`/admin/courses/${courseId}`, { method: 'PATCH', form });
      router.push(`/admin/courses/${courseId}?step=requirements`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-brand-500">What will learners be able to do after this course? One outcome per line.</p>
      {error && <Alert>{error}</Alert>}
      <ul className="space-y-3">
        {items.map((v, i) => (
          <li key={i} className="flex gap-2">
            <input className={inputClass} value={v} onChange={(e) => set(i, e.target.value)} placeholder="e.g. Read and apply crane load charts" aria-label={`Outcome ${i + 1}`} maxLength={300} disabled={loading} />
            <button type="button" aria-label={`Remove outcome ${i + 1}`} onClick={() => setItems((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : ['']))} className="rounded-full p-2.5 text-brand-500 hover:bg-brand-50">
              <CloseIcon className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setItems((l) => [...l, ''])} disabled={items.length >= 30} className="text-sm font-semibold text-brand-700 hover:text-brand-500 disabled:opacity-50">
        + Add outcome
      </button>
      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.push(`/admin/courses/${courseId}?step=content`)} className="text-sm font-semibold text-brand-700 hover:text-brand-500">← Back</button>
        <Button pill className="px-8 py-3" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save & continue →'}</Button>
      </div>
    </div>
  );
}
