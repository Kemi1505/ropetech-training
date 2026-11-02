'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ConfirmButton } from '@/components/admin/admin-actions';
import { Button } from '@/components/button';
import StatusChip from '@/components/courses/status-chip';
import { ChevronIcon } from '@/components/icons';
import { Alert } from '@/components/ui/form';
import { inputClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { Outline } from '@/lib/app-types';
import { formatBytes } from '@/lib/files';
import { LESSON_TYPES, mimeFor, putFile, validateLessonFile } from '@/lib/upload';

type Section = Outline['sections'][number];

const iconBtn = 'rounded-full p-1.5 text-brand-500 hover:bg-brand-100 disabled:opacity-30';
const textBtn = 'rounded-full px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50';

/** The three calls that add a lesson: ask for an upload URL, upload to S3, register the lesson. */
function AddLessonForm({ courseId, sectionId, onDone }: { courseId: string; sectionId: string; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof LESSON_TYPES)[number]['value']>('PDF');
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const current = LESSON_TYPES.find((t) => t.value === type)!;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) return setError('Give the lesson a title.');
    if (!file) return setError('Choose the file to upload.');

    const fileError = validateLessonFile(file);

    if (fileError) return setError(fileError);

    setLoading(true);
    try {
      const contentType = mimeFor(file);
      const slot = await apiFetch<{ uploadUrl: string; key: string }>(`/admin/courses/${courseId}/lessons/upload-url`, {
        method: 'POST',
        json: { type, fileName: file.name, contentType, size: file.size },
      });
      setPercent(0);
      await putFile(slot.uploadUrl, file, contentType, setPercent);
      await apiFetch(`/admin/courses/${courseId}/sections/${sectionId}/lessons`, {
        method: 'POST',
        json: { title: title.trim(), type, fileKey: slot.key, fileName: file.name },
      });
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error && !(err as { status?: number }).status ? err.message : getErrorMessage(err));
    } finally {
      setLoading(false);
      setPercent(null);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-4 rounded-lg bg-white p-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-brand-800">Lesson title</span>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-brand-800">Lesson type</span>
          <select className={inputClass} value={type} onChange={(e) => { setType(e.target.value as typeof type); setFile(null); }} disabled={loading}>
            {LESSON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-brand-800">File</span>
        <input type="file" accept={current.accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={loading} className="block w-full text-sm text-black file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100" />
        <span className="mt-1.5 block text-xs text-brand-500">{current.hint}{file ? ` Selected: ${formatBytes(file.size)}.` : ''}</span>
      </label>
      {percent !== null && (
        <div role="progressbar" aria-label="Upload progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-brand-100"><div className="h-full rounded-full bg-brand-700 transition-[width]" style={{ width: `${percent}%` }} /></div>
          <p className="mt-1 text-xs text-brand-500">{percent < 100 ? `Uploading ${percent}%` : 'Checking the file…'}</p>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" pill className="px-5 py-2" onClick={onDone} disabled={loading}>Cancel</Button>
        <Button type="submit" pill className="px-6 py-2" disabled={loading}>{loading ? 'Adding…' : 'Add lesson'}</Button>
      </div>
    </form>
  );
}

/** Step 2: sections and lessons. Reorder with the arrows; files upload straight to S3. */
export default function ContentStep({ courseId, outline }: { courseId: string; outline: Outline }) {
  const router = useRouter();
  const base = `/admin/courses/${courseId}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSection, setNewSection] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; kind: 'section' | 'lesson'; value: string } | null>(null);

  const sections = outline.sections;
  const lessonTotal = sections.reduce((n, s) => n + s.lessons.length, 0);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const swap = <T,>(list: T[], i: number, j: number) => {
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };
  const moveSection = (i: number, d: -1 | 1) =>
    run(() => apiFetch(`${base}/sections/reorder`, { method: 'PUT', json: { ids: swap(sections, i, i + d).map((s) => s.id) } }));
  const moveLesson = (s: Section, i: number, d: -1 | 1) =>
    run(() => apiFetch(`${base}/sections/${s.id}/lessons/reorder`, { method: 'PUT', json: { ids: swap(s.lessons, i, i + d).map((l) => l.id) } }));

  function saveName() {
    if (!editing || editing.value.trim().length < 2) return setError('The name needs at least 2 characters.');
    const e = editing;
    setEditing(null);
    run(() => apiFetch(e.kind === 'section' ? `${base}/sections/${e.id}` : `${base}/lessons/${e.id}`, { method: 'PATCH', json: { title: e.value.trim() } }));
  }

  const NameEditor = () => (
    <span className="flex flex-1 items-center gap-2">
      <input autoFocus className={`${inputClass} h-9`} value={editing!.value} onChange={(e) => setEditing({ ...editing!, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(null); }} />
      <button type="button" onClick={saveName} className={textBtn}>Save</button>
      <button type="button" onClick={() => setEditing(null)} className={textBtn}>Cancel</button>
    </span>
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-brand-500">
        Sections hold lessons, and each lesson is one file: a PDF, a video or slides. Use the arrows to change the order. The course needs at least one lesson to be published.
      </p>
      {error && <Alert>{error}</Alert>}

      {sections.length === 0 && <p className="rounded-lg bg-surface-alt px-5 py-6 text-center text-sm text-brand-500">No sections yet. Add your first section below.</p>}

      {sections.map((s, si) => (
        <section key={s.id} className="rounded-lg bg-surface-alt p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-brand-500">{String(si + 1).padStart(2, '0')}</span>
            {editing?.id === s.id ? <NameEditor /> : <h3 className="flex-1 font-semibold text-brand-800">{s.title}</h3>}
            <span className="hidden text-xs text-brand-500 sm:inline">{s.lessons.length} {s.lessons.length === 1 ? 'lesson' : 'lessons'}</span>
            <button type="button" aria-label="Move section up" className={iconBtn} disabled={busy || si === 0} onClick={() => moveSection(si, -1)}><ChevronIcon dir="up" className="size-5" /></button>
            <button type="button" aria-label="Move section down" className={iconBtn} disabled={busy || si === sections.length - 1} onClick={() => moveSection(si, 1)}><ChevronIcon className="size-5" /></button>
            <button type="button" className={textBtn} onClick={() => setEditing({ id: s.id, kind: 'section', value: s.title })}>Rename</button>
            <ConfirmButton label="Delete" title="Delete this section?" message={`"${s.title}" and its ${s.lessons.length} lessons will be deleted, including their files.`} confirmLabel="Delete section" method="DELETE" path={`${base}/sections/${s.id}`} variant="soft" danger small />
          </div>

          <ul className="mt-3 space-y-2">
            {s.lessons.map((l, li) => (
              <li key={l.id} className="rounded-md bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip kind="neutral">{l.type === 'PDF' ? 'PDF' : l.type === 'VIDEO' ? 'Video' : 'Slides'}</StatusChip>
                  {editing?.id === l.id ? <NameEditor /> : (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-black">{l.title}</span>
                      <span className="block truncate text-xs text-brand-500">{l.fileName} · {formatBytes(l.fileSize)}</span>
                    </span>
                  )}
                  <button type="button" aria-label="Move lesson up" className={iconBtn} disabled={busy || li === 0} onClick={() => moveLesson(s, li, -1)}><ChevronIcon dir="up" className="size-4" /></button>
                  <button type="button" aria-label="Move lesson down" className={iconBtn} disabled={busy || li === s.lessons.length - 1} onClick={() => moveLesson(s, li, 1)}><ChevronIcon className="size-4" /></button>
                  <button type="button" className={textBtn} onClick={() => setEditing({ id: l.id, kind: 'lesson', value: l.title })}>Rename</button>
                  <button type="button" className={textBtn} disabled={busy} onClick={() => run(() => apiFetch(`${base}/lessons/${l.id}/duplicate`, { method: 'POST' }))}>Duplicate</button>
                  {sections.length > 1 && (
                    <select aria-label="Move lesson to another section" value="" disabled={busy} onChange={(e) => e.target.value && run(() => apiFetch(`${base}/lessons/${l.id}/move`, { method: 'PATCH', json: { sectionId: e.target.value } }))} className="h-8 rounded-full bg-brand-50 px-3 text-xs font-semibold text-brand-700">
                      <option value="">Move to…</option>
                      {sections.filter((o) => o.id !== s.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                  )}
                  <ConfirmButton label="Delete" title="Delete this lesson?" message={`"${l.title}" and its file will be deleted.`} confirmLabel="Delete lesson" method="DELETE" path={`${base}/lessons/${l.id}`} variant="soft" danger small />
                </div>
              </li>
            ))}
          </ul>

          {adding === s.id ? (
            <AddLessonForm courseId={courseId} sectionId={s.id} onDone={() => setAdding(null)} />
          ) : (
            <button type="button" onClick={() => setAdding(s.id)} className="mt-3 text-sm font-semibold text-brand-700 hover:text-brand-500">+ Add lesson</button>
          )}
        </section>
      ))}

      <form onSubmit={(e) => { e.preventDefault(); if (newSection.trim().length < 2) return setError('The section needs a title of at least 2 characters.'); run(async () => { await apiFetch(`${base}/sections`, { method: 'POST', json: { title: newSection.trim() } }); setNewSection(''); }); }} className="flex flex-wrap gap-2">
        <input className={`${inputClass} max-w-sm`} placeholder="New section title" aria-label="New section title" value={newSection} onChange={(e) => setNewSection(e.target.value)} disabled={busy} />
        <Button type="submit" variant="soft" pill className="px-5" disabled={busy}>+ Add section</Button>
      </form>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => router.push(`/admin/courses/${courseId}?step=basic`)} className="text-sm font-semibold text-brand-700 hover:text-brand-500">← Back</button>
        <Button pill className="px-8 py-3" disabled={lessonTotal === 0} onClick={() => router.push(`/admin/courses/${courseId}?step=outcomes`)}>Continue →</Button>
      </div>
    </div>
  );
}