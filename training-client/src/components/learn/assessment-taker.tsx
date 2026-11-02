'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, LinkButton } from '@/components/button';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { Alert } from '@/components/ui/form';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { AssessmentView } from '@/lib/app-types';

interface Result {
  score: number;
  correct: number;
  total: number;
  passMark: number;
  passed: boolean;
  message: string;
  attemptsRemaining: number;
}

/** Take the assessment one question at a time, submit, and see the score. */
export default function AssessmentTaker({ view }: { view: AssessmentView }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = view.questions;
  const q = questions[index];
  const answered = Object.keys(answers).length;
  const last = index === questions.length - 1;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Result>(`/courses/${view.courseId}/assessment/submit`, {
        method: 'POST',
        json: { answers: questions.map((x) => ({ questionId: x.id, optionId: answers[x.id] })) },
      });
      setResult(res);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function again() {
    setResult(null);
    setAnswers({});
    setIndex(0);
  }

  // ------------------------------------------------------------------- result
  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-lg bg-white p-8 text-center shadow-md shadow-brand-900/10">
        <span className={`mx-auto flex size-16 items-center justify-center rounded-full ${result.passed ? 'bg-green-50 text-green-700' : 'bg-accent-100 text-accent-600'}`}>
          {result.passed ? <CheckIcon className="size-8" /> : <CloseIcon className="size-8" />}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-brand-800">{result.passed ? 'You passed!' : 'Not this time'}</h1>
        <p className={`mt-2 text-4xl font-bold ${result.passed ? 'text-green-700' : 'text-accent-600'}`}>{result.score}%</p>
        <p className="mt-1 text-sm text-brand-500">
          {result.correct} of {result.total} correct · pass mark {result.passMark}%
        </p>
        <p className="mt-5 text-sm text-black">{result.message}</p>
        <div className="mt-7 space-y-3">
          {result.passed ? (
            <>
              <LinkButton href="/certificates" pill className="w-full py-3">View certificate</LinkButton>
              <LinkButton href={`/courses/${view.courseId}`} variant="soft" pill className="w-full py-3">Back to course</LinkButton>
            </>
          ) : (
            <>
              {result.attemptsRemaining > 0 && (
                <Button pill className="w-full py-3" onClick={again}>Try again</Button>
              )}
              <LinkButton href={`/learn/${view.courseId}`} variant="soft" pill className="w-full py-3">Review lessons</LinkButton>
            </>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ questions
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-brand-800">
          Question {index + 1} of {questions.length}
        </span>
        <span className="text-brand-500">
          Attempt {view.attemptsUsed + 1} of {view.maxAttempts}
        </span>
      </div>
      <div role="progressbar" aria-label="Questions answered" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={questions.length} className="mt-3 h-1.5 rounded-full bg-brand-100">
        <div className="h-full rounded-full bg-brand-700" style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow-md shadow-brand-900/10">
        <h1 className="text-lg font-semibold text-brand-800">{q.text}</h1>
        <div role="radiogroup" aria-label={q.text} className="mt-5 space-y-3">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm ${selected ? 'border-brand-500 bg-brand-50 font-medium text-brand-800' : 'border-brand-200 bg-white text-black hover:bg-brand-50'}`}
              >
                <input type="radio" name={q.id} checked={selected} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))} className="size-4 accent-brand-700" />
                {o.text}
              </label>
            );
          })}
        </div>

        {error && <div className="mt-5"><Alert>{error}</Alert></div>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="soft" pill onClick={() => setIndex((i) => i - 1)} disabled={index === 0 || loading}>Previous</Button>
          {last ? (
            <Button pill className="px-7" onClick={submit} disabled={answered < questions.length || loading}>
              {loading ? 'Submitting…' : 'Submit answers'}
            </Button>
          ) : (
            <Button pill className="px-7" onClick={() => setIndex((i) => i + 1)} disabled={!answers[q.id]}>Next</Button>
          )}
        </div>
        {last && answered < questions.length && (
          <p className="mt-3 text-right text-xs text-brand-500">Answer every question to submit ({answered} of {questions.length}).</p>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-brand-500">
        <Link href={`/learn/${view.courseId}`} className="hover:text-brand-700">Leave and review lessons</Link>
      </p>
    </div>
  );
}
