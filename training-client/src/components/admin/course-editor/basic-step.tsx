'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import FileField from '@/components/ui/file-field';
import { Alert, Field } from '@/components/ui/form';
import { inputClass, textareaClass } from '@/components/ui/styles';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { EditorCourse } from '@/lib/app-types';
import { PICTURE_RULE, validateFile } from '@/lib/files';
import { apiUrl, titleCase } from '@/lib/format';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
type Errors = Partial<Record<'name' | 'shortDescription' | 'description' | 'price' | 'difficulty' | 'picture', string>>;

/** Step 1. With no `course` it creates a draft; with one it edits it. */
export default function BasicStep({ course }: { course?: EditorCourse }) {
  const router = useRouter();
  const [name, setName] = useState(course?.name ?? '');
  const [shortDescription, setShort] = useState(course?.shortDescription ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [price, setPrice] = useState(course ? String(course.price) : '');
  const [difficulty, setDifficulty] = useState<(typeof LEVELS)[number] | ''>(course?.difficulty ?? '');
  const [picture, setPicture] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amount = Number(price.replace(/,/g, ''));
    const found: Errors = {
      name: name.trim().length >= 3 ? undefined : 'Enter the course title (at least 3 characters).',
      shortDescription: shortDescription.trim().length >= 10 && shortDescription.trim().length <= 160 ? undefined : 'Write 10 to 160 characters.',
      description: description.trim().length >= 10 ? undefined : 'Write the course description (at least 10 characters).',
      price: price.trim() !== '' && Number.isFinite(amount) && amount >= 0 ? undefined : 'Enter the price in naira (0 for free).',
      difficulty: difficulty ? undefined : 'Choose a difficulty.',
      picture: validateFile(picture, PICTURE_RULE),
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const form = new FormData();
    form.set('name', name.trim());
    form.set('shortDescription', shortDescription.trim());
    form.set('description', description.trim());
    form.set('price', String(amount));
    form.set('difficulty', difficulty);
    if (picture) form.set('picture', picture);

    setLoading(true);
    try {
      const saved = course
        ? await apiFetch<{ id: string }>(`/admin/courses/${course.id}`, { method: 'PATCH', form })
        : await apiFetch<{ id: string }>('/admin/courses', { method: 'POST', form });
      router.push(`/admin/courses/${saved.id}?step=content`);
      router.refresh();
    } catch (err) {
      setFormError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {formError && <Alert>{formError}</Alert>}
      <Field label="Course title" error={errors.name}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
      </Field>
      <Field label="Short description" error={errors.shortDescription} hint={`Shown on course cards. ${shortDescription.trim().length} / 160`}>
        <textarea className={textareaClass} rows={2} maxLength={200} value={shortDescription} onChange={(e) => setShort(e.target.value)} disabled={loading} />
      </Field>
      <Field label="Course description" error={errors.description} hint="Shown on the course page under Course overview. Leave a blank line between paragraphs.">
        <textarea className={textareaClass} rows={6} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (₦)" error={errors.price}>
          <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} disabled={loading} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-brand-800">Difficulty</legend>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <label key={l} className={`flex h-11 cursor-pointer items-center justify-center rounded-md border text-xs font-semibold ${difficulty === l ? 'border-brand-700 bg-brand-700 text-white' : 'border-brand-200 bg-white text-brand-800 hover:bg-brand-50'}`}>
                <input type="radio" name="difficulty" className="sr-only" checked={difficulty === l} onChange={() => setDifficulty(l)} disabled={loading} />
                {titleCase(l)}
              </label>
            ))}
          </div>
          {errors.difficulty && <p className="mt-1.5 text-xs text-red-600">{errors.difficulty}</p>}
        </fieldset>
      </div>

      <div className="space-y-3">
        {course?.pictureUrl && !picture && (
          <div className="flex items-center gap-3">
            <Image unoptimized src={apiUrl(course.pictureUrl)} alt="" width={96} height={60} className="h-[60px] w-24 rounded-md object-cover" />
            <span className="text-sm text-brand-500">Current image</span>
          </div>
        )}
        <FileField label="Course image" hint="PNG or JPG, up to 3 MB." accept="image/png,image/jpeg" file={picture} onChange={setPicture} error={errors.picture} disabled={loading} optional />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/courses" className="text-sm font-semibold text-brand-700 hover:text-brand-500">Cancel</Link>
        <Button type="submit" pill className="px-8 py-3" disabled={loading}>
          {loading ? 'Saving…' : 'Save & continue →'}
        </Button>
      </div>
    </form>
  );
}
