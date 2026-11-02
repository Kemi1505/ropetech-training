'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { apiFetch, getErrorMessage } from '@/lib/api';

/** Enroll, then open the payment dialog so the learner sees where to pay. */
export default function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/courses/${courseId}/enroll`, { method: 'POST' });
      router.push(`/courses/${courseId}?pay=details`); // straight to the payment dialog
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err)); // e.g. "Complete your profile before enrolling"
      setLoading(false);
    }
  }

  return (
    <div>
      <Button pill className="w-full py-3 text-base" onClick={enroll} disabled={loading}>
        {loading ? 'Enrolling…' : 'Enroll in Course'}
      </Button>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
