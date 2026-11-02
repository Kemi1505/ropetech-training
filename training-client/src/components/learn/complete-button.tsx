'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { CheckIcon } from '@/components/icons';
import { apiFetch, getErrorMessage } from '@/lib/api';

/** "Mark as complete". When it was the last lesson, it points the learner to the assessment. */
export default function CompleteButton({
  courseId,
  lessonId,
  completed,
  nextHref,
}: {
  courseId: string;
  lessonId: string;
  completed: boolean;
  nextHref: string | null; // where to go after completing (the next lesson), or null for the last one
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ allDone: boolean }>(`/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' });
      if (nextHref) router.push(nextHref);
      else if (res.allDone) router.push(`/learn/${courseId}/assessment`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700">
        <CheckIcon className="size-4" /> Completed
      </span>
    );
  }
  return (
    <div>
      <Button pill className="px-8 py-3" onClick={complete} disabled={loading}>
        {loading ? 'Saving…' : 'Mark as complete'}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
