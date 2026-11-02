'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmButton } from '@/components/admin/admin-actions';
import { Button } from '@/components/button';
import StatusChip from '@/components/courses/status-chip';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { Alert } from '@/components/ui/form';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { CourseSetup, EditorCourse } from '@/lib/app-types';

const STATUS = {
  DRAFT: { kind: 'draft', label: 'Draft' },
  PUBLISHED: { kind: 'done', label: 'Published' },
  UNPUBLISHED: { kind: 'unpublished', label: 'Unpublished' },
} as const;

/** Step 6: check everything, then publish. Also where a course is unpublished, featured or deleted. */
export default function ReviewStep({ course, setup, isSuperadmin }: { course: EditorCourse; setup: CourseSetup; isSuperadmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { steps } = setup;

  async function call(path: string, method: 'PATCH', json?: unknown, then?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(path, { method, json });
      then ? then() : router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const rows = [
    { step: 'basic', ok: steps.basic.done, title: 'Basic info', text: `${course.name}, ${course.difficulty.toLowerCase()}, ₦${course.price.toLocaleString('en-NG')}` },
    { step: 'content', ok: steps.content.done, title: 'Content', text: `${steps.content.sections} sections, ${steps.content.lessons} lessons` },
    { step: 'outcomes', ok: steps.outcomes.done, title: 'Outcomes', text: `${steps.outcomes.count} learning outcomes` },
    { step: 'requirements', ok: steps.requirements.done, title: 'Requirements', text: steps.requirements.requiresPreviousCertification ? course.certificationRequirement ?? 'Certification required' : 'Open to everyone' },
    { step: 'assessment', ok: steps.assessment.done && steps.assessment.passMark !== null, title: 'Assessment', text: `${steps.assessment.count} questions, pass mark ${steps.assessment.passMark ?? 'not set'}${steps.assessment.passMark ? '%' : ''}, ${steps.assessment.maxAttempts} attempts` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-brand-500">Status</span>
        <StatusChip kind={STATUS[setup.status].kind}>{STATUS[setup.status].label}</StatusChip>
      </div>
      {error && <Alert>{error}</Alert>}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.step} className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-md shadow-brand-900/10">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {r.ok ? <CheckIcon className="size-4" /> : <CloseIcon className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-brand-800">{r.title}</span>
              <span className="block truncate text-xs text-brand-500">{r.text}</span>
            </span>
            <Link href={`/admin/courses/${course.id}?step=${r.step}`} className="text-sm font-semibold text-brand-700 hover:text-brand-500">Edit</Link>
          </li>
        ))}
      </ul>

      {!setup.canPublish && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Before you can publish:</p>
          <ul className="mt-1 list-disc pl-5">{setup.issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}

      <label className="flex items-start gap-3 rounded-lg bg-surface-alt p-4">
        <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={course.isFeatured} disabled={busy} onChange={(e) => call(`/admin/courses/${course.id}/featured`, 'PATCH', { isFeatured: e.target.checked })} />
        <span>
          <span className="block text-sm font-semibold text-brand-800">Featured course</span>
          <span className="block text-xs text-brand-500">Featured courses are shown first in the Featured row on the learner dashboard.</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link href="/admin/courses" className="text-sm font-semibold text-brand-700 hover:text-brand-500">Save draft and leave</Link>
        <div className="flex flex-wrap gap-3">
          {setup.status === 'PUBLISHED' ? (
            <ConfirmButton label="Unpublish" title="Unpublish this course?" message="It disappears from the course list. Learners who already enrolled keep their access." confirmLabel="Unpublish" method="PATCH" path={`/admin/courses/${course.id}/unpublish`} variant="soft" />
          ) : (
            <Button variant="accent" pill className="px-8 py-3" disabled={!setup.canPublish || busy} onClick={() => call(`/admin/courses/${course.id}/publish`, 'PATCH', undefined, () => { router.push('/admin/courses?status=PUBLISHED'); router.refresh(); })}>
              {busy ? 'Publishing…' : 'Publish course'}
            </Button>
          )}
        </div>
      </div>

      {isSuperadmin && (
        <div className="rounded-lg bg-surface-alt p-4">
          <p className="text-sm font-semibold text-red-600">Delete course</p>
          <p className="mt-1 text-xs text-brand-500">Superadmin only. Not possible once learners have enrolled; unpublish it instead.</p>
          <div className="mt-3">
            <ConfirmButton label="Delete course" title="Delete this course?" message="The course, its lessons and their files are permanently deleted." confirmLabel="Delete course" method="DELETE" path={`/admin/courses/${course.id}`} variant="soft" danger small onDone={() => router.push('/admin/courses')} />
          </div>
        </div>
      )}
    </div>
  );
}
