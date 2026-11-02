'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import StatusChip from '@/components/courses/status-chip';
import FileField from '@/components/ui/file-field';
import { Alert, Field } from '@/components/ui/form';
import PhoneField from '@/components/ui/phone-field-new';
import { inputClass } from '@/components/ui/styles';
import { apiFetch, ApiError, getErrorMessage } from '@/lib/api';
import { ProfileView } from '@/lib/app-types';
import { CERTIFICATION_RULE, PICTURE_RULE, validateFile } from '@/lib/files';
import { apiUrl } from '@/lib/format';
import { fromE164, PhoneValue, toE164 } from '@/lib/phone';

type Errors = { firstName?: string; lastName?: string; phone?: string; hasCert?: string; certFile?: string; picture?: string };

/**
 * One form for "Complete your profile" and "Edit profile".
 * Learners also give a company and say whether they hold a previous certification. Admins do not.
 */
export default function ProfileForm({
  mode,
  role,
  profile,
}: {
  mode: 'complete' | 'edit';
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  profile?: ProfileView;
}) {
  const router = useRouter();
  const isLearner = role === 'USER';
  const hadCert = !!profile?.certification;

  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState<PhoneValue>(fromE164(profile?.phone));
  const [company, setCompany] = useState(profile?.company ?? '');
  const [hasCert, setHasCert] = useState<'yes' | 'no' | null>(profile ? (profile.hasPreviousCertification ? 'yes' : 'no') : null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);

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
        if (certFile) found.certFile = validateFile(certFile, CERTIFICATION_RULE);
        else if (!hadCert) found.certFile = 'Upload your certification.';
      }
    }
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const form = new FormData();
    form.set('firstName', firstName.trim());
    form.set('lastName', lastName.trim());
    form.set('phone', e164!);
    if (isLearner) {
      if (mode === 'edit' || company.trim()) form.set('company', company.trim()); // empty text clears it when editing
      form.set('hasPreviousCertification', String(hasCert === 'yes'));
      if (hasCert === 'yes' && certFile) form.set('certificationFile', certFile);
    }
    if (picture) form.set('picture', picture);

    setLoading(true);
    try {
      await apiFetch('/profile', { method: mode === 'complete' ? 'POST' : 'PATCH', form });
      if (mode === 'complete') {
        router.replace('/dashboard');
        router.refresh();
        return;
      }
      setSaved(true);
      setCertFile(null);
      setPicture(null);
      router.refresh();
    } catch (err) {
      if (mode === 'complete' && err instanceof ApiError && err.status === 409) {
        router.replace('/dashboard'); // already completed somewhere else
        router.refresh();
        return;
      }
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const cert = profile?.certification;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert>{formError}</Alert>}
      {saved && <Alert kind="success">Your profile has been saved.</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName}>
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" disabled={loading} />
        </Field>
        <Field label="Last name" error={errors.lastName}>
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" disabled={loading} />
        </Field>
      </div>

      <PhoneField label="Phone number" value={phone} onChange={setPhone} error={errors.phone} disabled={loading} />

      {isLearner && (
        <>
          <Field label="Company" optional>
            <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" disabled={loading} />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-brand-800">Do you have a previous certification?</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['yes', 'no'] as const).map((opt) => (
                <label
                  key={opt}
                  className={`flex h-11 cursor-pointer items-center gap-3 rounded-md border px-4 text-sm font-medium text-black ${
                    hasCert === opt ? 'border-brand-500 bg-brand-50' : 'border-brand-200 bg-white'
                  }`}
                >
                  <input type="radio" name="hasPreviousCertification" checked={hasCert === opt} onChange={() => setHasCert(opt)} disabled={loading} className="size-4 accent-brand-700" />
                  {opt === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
            {errors.hasCert && <p className="mt-1.5 text-xs text-red-600">{errors.hasCert}</p>}
          </fieldset>

          {hasCert === 'yes' && (
            <div className="space-y-3">
              {cert && (
                <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface-alt px-4 py-3 text-sm">
                  <StatusChip kind={cert.status === 'APPROVED' ? 'done' : cert.status === 'REJECTED' ? 'rejected' : 'pending'}>
                    {cert.status === 'APPROVED' ? 'Approved' : cert.status === 'REJECTED' ? 'Rejected' : 'Pending review'}
                  </StatusChip>
                  <a href={apiUrl('/profile/certification-file')} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:text-brand-500">
                    View uploaded file
                  </a>
                  {cert.status === 'REJECTED' && cert.rejectionReason && <span className="w-full text-red-600">Reason: {cert.rejectionReason}</span>}
                </div>
              )}
              <FileField
                label={cert ? 'Upload a new certification' : 'Upload your certification'}
                hint="PDF, PNG or JPG, up to 5 MB."
                accept="application/pdf,image/png,image/jpeg"
                file={certFile}
                onChange={setCertFile}
                error={errors.certFile}
                disabled={loading}
              />
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        {profile?.pictureUrl && !picture && (
          <div className="flex items-center gap-3">
            <Image unoptimized src={apiUrl(profile.pictureUrl)} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
            <span className="text-sm text-brand-500">Current picture</span>
          </div>
        )}
        <FileField
          label="Profile picture"
          hint="PNG or JPG, up to 3 MB."
          accept="image/png,image/jpeg"
          file={picture}
          onChange={setPicture}
          error={errors.picture}
          disabled={loading}
          optional
        />
      </div>

      <Button type="submit" pill className="w-full py-3 text-base" disabled={loading}>
        {loading ? 'Saving…' : mode === 'complete' ? 'Save and continue' : 'Save changes'}
      </Button>
    </form>
  );
}
