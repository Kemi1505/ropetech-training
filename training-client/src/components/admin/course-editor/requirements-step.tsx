'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { Alert, Field } from '@/components/ui/form';
import { inputClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';

/** Step 4: does the course need a previous certification? Eligibility is checked from the learner's profile. */
export default function RequirementsStep({ courseId, requires, text }: { courseId: string; requires: boolean; text: string | null }) {
  const router = useRouter();
  const [needs, setNeeds] = useState(requires);
  const [requirement, setRequirement] = useState(text ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (needs && requirement.trim().length < 3) return setError('Describe the certification learners need.');
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('requiresPreviousCertification', String(needs));
      if (needs) form.set('certificationRequirement', requirement.trim());
      await apiFetch(`/admin/courses/${courseId}`, { method: 'PATCH', form });
      router.push(`/admin/courses/${courseId}?step=assessment`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-brand-500">Does a learner need a previous certification to take this course?</p>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { v: false, t: 'No, open to everyone' },
          { v: true, t: 'Yes, a previous certification is required' },
        ].map((o) => (
          <label key={String(o.v)} className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium ${needs === o.v ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-brand-200 bg-white text-black'}`}>
            <input type="radio" name="needs" className="size-4 accent-brand-700" checked={needs === o.v} onChange={() => setNeeds(o.v)} disabled={loading} />
            {o.t}
          </label>
        ))}
      </div>
      {needs && (
        <Field label="Certification requirement (shown to learners)" hint="For example: Valid Banksman certification required.">
          <input className={inputClass} value={requirement} onChange={(e) => setRequirement(e.target.value)} maxLength={300} disabled={loading} />
        </Field>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.push(`/admin/courses/${courseId}?step=outcomes`)} className="text-sm font-semibold text-brand-700 hover:text-brand-500">← Back</button>
        <Button pill className="px-8 py-3" onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save & continue →'}</Button>
      </div>
    </div>
  );
}
