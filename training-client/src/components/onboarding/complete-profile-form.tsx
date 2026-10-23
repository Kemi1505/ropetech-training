'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { FormAlert, SubmitButton, TextField } from '@/components/auth/fields';
import FileField from '@/components/ui/file-field';
import PhoneField from '@/components/ui/phone-field';
import { ApiError, apiFetch, getErrorMessage } from '@/lib/api';
import { CERTIFICATION_RULE, PICTURE_RULE, validateFile } from '@/lib/files';
import { DEFAULT_COUNTRY, PhoneValue, toE164 } from '@/lib/phone';
import type { Role } from '@/lib/types';

type Errors = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  hasCert?: string;
  certFile?: string;
  picture?: string;
};

export default function CompleteProfileForm({
  role,
}: {
  role: Role;
}) {
  const router = useRouter();
  const isLearner = role === 'USER'; // admins don't get company / certification

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState<PhoneValue>({ country: DEFAULT_COUNTRY, national: '' });
  const [company, setCompany] = useState('');
  const [hasCert, setHasCert] = useState<'yes' | 'no' | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const e164 = toE164(phone);
    const found: Errors = {
      firstName: firstName.trim() ? undefined : 'Enter your first name.',
      lastName: lastName.trim() ? undefined : 'Enter your last name.',
      phone: e164 ? undefined : 'Enter a valid phone number for the selected country.',
      picture: validateFile(picture, PICTURE_RULE),
    };
    if (isLearner) {
      if (!hasCert) found.hasCert = 'Choose yes or no.';
      if (hasCert === 'yes') {
        found.certFile = certFile ? validateFile(certFile, CERTIFICATION_RULE) : 'Upload your certification.';
      }
    }
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const form = new FormData();
    form.set('firstName', firstName.trim());
    form.set('lastName', lastName.trim());
    form.set('phone', e164!);
    if (isLearner) {
      if (company.trim()) form.set('company', company.trim());
      form.set('hasPreviousCertification', String(hasCert === 'yes'));
      if (hasCert === 'yes' && certFile) form.set('certificationFile', certFile);
    }
    if (picture) form.set('picture', picture);

    setLoading(true);
    try {
      await apiFetch('/profile', { method: 'POST', form });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        router.replace('/dashboard'); // already completed elsewhere
        router.refresh();
        return;
      }
      setFormError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={formError} />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          disabled={loading}
        />
        <TextField
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          disabled={loading}
        />
      </div>

      <PhoneField label="Phone number" value={phone} onChange={setPhone} error={errors.phone} disabled={loading} />

      <FileField
        label="Profile picture"
        hint="PNG or JPG, up to 3 MB."
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        file={picture}
        onChange={setPicture}
        error={errors.picture}
        disabled={loading}
        optional
      />

      {isLearner && (
        <>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="company" className="text-sm font-semibold text-navy-900">
                Company
              </label>
              <span className="text-xs text-muted">Optional</span>
            </div>
            <input
              id="company"
              name="company"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-navy-900">Do you have a previous certification?</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['yes', 'no'] as const).map((opt) => (
                <label
                  key={opt}
                  className={`flex h-12 cursor-pointer items-center gap-3 border bg-white px-4 text-base font-semibold text-navy-900 ${
                    hasCert === opt ? 'border-navy-900 ring-1 ring-navy-900' : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="hasPreviousCertification"
                    value={opt}
                    checked={hasCert === opt}
                    onChange={() => setHasCert(opt)}
                    disabled={loading}
                    className="size-4 accent-navy-900"
                  />
                  {opt === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
            {errors.hasCert && <p className="mt-1.5 text-sm text-red-700">{errors.hasCert}</p>}
          </fieldset>

          {hasCert === 'yes' && (
            <FileField
              label="Upload your certification"
              hint="PDF or PNG, up to 5 MB. An admin will review it before it counts towards courses that require one."
              accept="application/pdf,image/png"
              file={certFile}
              onChange={setCertFile}
              error={errors.certFile}
              disabled={loading}
            />
          )}
        </>
      )}


      <SubmitButton loading={loading} loadingText="Saving…">
        Save and continue
      </SubmitButton>
      
    </form>
  );
}
