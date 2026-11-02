'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ConfirmButton } from '@/components/admin/admin-actions';
import { Button } from '@/components/button';
import { CloseIcon } from '@/components/icons';
import { Alert, Field } from '@/components/ui/form';
import { inputClass, textareaClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { AssessmentAdmin } from '@/lib/app-types';

type Question = AssessmentAdmin['questions'][number];
interface Draft { text: string; options: { text: string; correct: boolean }[] }

const blank = (): Draft => ({ text: '', options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }] });
const fromQuestion = (q: Question): Draft => ({ text: q.text, options: q.options.map((o) => ({ text: o.text, correct: o.isCorrect })) });

/** Add or edit one multiple-choice question (2 to 6 options, exactly one correct). */
function QuestionForm({ courseId, question, onDone }: { courseId: string; question: Question | null; onDone: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(question ? fromQuestion(question) : blank());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setOption = (i: number, patch: Partial<Draft['options'][number]>) =>
    setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const texts = draft.options.map((o) => o.text.trim());
    if (draft.text.trim().length < 3) return setError('Write the question.');
    if (texts.some((t) => !t)) return setError('Fill in every option, or remove the empty ones.');
    if (new Set(texts.map((t) => t.toLowerCase())).size !== texts.length) return setError('The options must be different from each other.');
    if (draft.options.filter((o) => o.correct).length !== 1) return setError('Mark exactly one option as correct.');

    setLoading(true);
    try {
      const body = { text: draft.text.trim(), options: draft.options.map((o) => ({ text: o.text.trim(), isCorrect: o.correct })) };
      await apiFetch(question ? `/admin/courses/${courseId}/assessment/questions/${question.id}` : `/admin/courses/${courseId}/assessment/questions`, {
        method: question ? 'PATCH' : 'POST',
        json: body,
      });
      router.refresh();
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-lg bg-white p-5 shadow-md shadow-brand-900/10">
      <h3 className="font-semibold text-brand-800">{question ? 'Edit question' : 'New question'}</h3>
      {error && <Alert>{error}</Alert>}
      <Field label="Question">
        <textarea className={textareaClass} rows={2} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} disabled={loading} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-brand-800">Options (pick the correct one)</legend>
        <ul className="space-y-2">
          {draft.options.map((o, i) => (
            <li key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" aria-label={`Option ${i + 1} is correct`} className="size-4 shrink-0 accent-green-600" checked={o.correct} onChange={() => setDraft((d) => ({ ...d, options: d.options.map((x, j) => ({ ...x, correct: j === i })) }))} disabled={loading} />
              <input className={`${inputClass} ${o.correct ? 'border-green-400' : ''}`} value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} maxLength={300} disabled={loading} />
              {o.correct && <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Correct</span>}
              <button type="button" aria-label={`Remove option ${i + 1}`} disabled={draft.options.length <= 2 || loading} onClick={() => setDraft((d) => { const options = d.options.filter((_, j) => j !== i); if (!options.some((x) => x.correct)) options[0].correct = true; return { ...d, options }; })} className="rounded-full p-2 text-brand-500 hover:bg-brand-50 disabled:opacity-30">
                <CloseIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" disabled={draft.options.length >= 6 || loading} onClick={() => setDraft((d) => ({ ...d, options: [...d.options, { text: '', correct: false }] }))} className="mt-3 text-sm font-semibold text-brand-700 hover:text-brand-500 disabled:opacity-50">+ Add option</button>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" pill className="px-5 py-2" onClick={onDone} disabled={loading}>Cancel</Button>
        <Button type="submit" pill className="px-6 py-2" disabled={loading}>{loading ? 'Saving…' : 'Save question'}</Button>
      </div>
    </form>
  );
}

/** Step 5: the questions, the pass mark and the number of attempts. */
export default function AssessmentStep({ courseId, data }: { courseId: string; data: AssessmentAdmin }) {
  const router = useRouter();
  const [passMark, setPassMark] = useState(String(data.passMark ?? 70));
  const [attempts, setAttempts] = useState(String(data.maxAttempts));
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    const pm = Number(passMark);
    const at = Number(attempts);
    if (!Number.isInteger(pm) || pm < 1 || pm > 100) return setMessage({ kind: 'error', text: 'The pass mark is a percentage from 1 to 100.' });
    if (!Number.isInteger(at) || at < 1 || at > 20) return setMessage({ kind: 'error', text: 'Attempts must be a whole number from 1 to 20.' });
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/courses/${courseId}/assessment/finish`, { method: 'POST', json: { passMark: pm, maxAttempts: at, publish: false } });
      setMessage({ kind: 'success', text: 'Pass mark and attempts saved.' });
      router.refresh();
    } catch (err) {
      setMessage({ kind: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-500">Multiple-choice questions with 2 to 6 options and one correct answer. You can edit everything at any time, even after publishing.</p>

      <div className="rounded-lg bg-surface-alt p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-brand-800">Pass mark (%)</span>
            <input className={`${inputClass} w-28`} inputMode="numeric" value={passMark} onChange={(e) => setPassMark(e.target.value)} disabled={saving} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-brand-800">Attempts per learner</span>
            <input className={`${inputClass} w-28`} inputMode="numeric" value={attempts} onChange={(e) => setAttempts(e.target.value)} disabled={saving} />
          </label>
          <Button variant="soft" pill className="px-6 py-2.5" onClick={saveSettings} disabled={saving || data.questionCount === 0}>{saving ? 'Saving…' : 'Save settings'}</Button>
        </div>
        {data.questionCount === 0 && <p className="mt-3 text-xs text-brand-500">Add at least one question first, then save the pass mark.</p>}
        {message && <div className="mt-4"><Alert kind={message.kind}>{message.text}</Alert></div>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-brand-800">Questions ({data.questionCount})</h2>
        {editing === null && <Button pill className="px-5 py-2" onClick={() => setEditing('new')}>+ Add question</Button>}
      </div>

      {editing !== null && <QuestionForm key={editing === 'new' ? 'new' : editing.id} courseId={courseId} question={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}

      {data.questions.length === 0 && editing === null && <p className="rounded-lg bg-surface-alt px-5 py-6 text-center text-sm text-brand-500">No questions yet.</p>}
      <ol className="space-y-2">
        {data.questions.map((q, i) => (
          <li key={q.id} className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-md shadow-brand-900/10">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-black">{q.text}</span>
              <span className="block text-xs text-brand-500">{q.options.length} options</span>
            </span>
            <button type="button" onClick={() => setEditing(q)} className="rounded-full px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">Edit</button>
            <ConfirmButton label="Delete" title="Delete this question?" message="The question and its options will be removed. Past scores are not changed." confirmLabel="Delete question" method="DELETE" path={`/admin/courses/${courseId}/assessment/questions/${q.id}`} variant="soft" danger small />
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.push(`/admin/courses/${courseId}?step=requirements`)} className="text-sm font-semibold text-brand-700 hover:text-brand-500">← Back</button>
        <Button pill className="px-8 py-3" onClick={() => router.push(`/admin/courses/${courseId}?step=review`)}>Continue →</Button>
      </div>
    </div>
  );
}
