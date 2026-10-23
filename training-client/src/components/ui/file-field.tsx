'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatBytes } from '@/lib/files';

export default function FileField({
  label,
  hint,
  accept,
  file,
  onChange,
  error,
  disabled,
  optional,
}: {
  label: string;
  hint?: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
  optional?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-navy-900">
          {label}
        </label>
        {optional && <span className="text-xs text-muted">Optional</span>}
      </div>

      <div
        className={`flex items-center gap-3 rounded-md border bg-white p-3 ${
          error ? 'border-red-500' : 'border-brand-200'
        }`}
        >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="peer sr-only"
        />
        
        <label
          htmlFor={id}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 border border-line bg-surface px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy-900 peer-disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M5 15v4h14v-4" />
          </svg>
          {file ? 'Change file' : 'Upload file'}
        </label>

        {file ? (
          <>
            {previewUrl && (
              <img
                src={previewUrl}
                alt={`Preview of ${file.name}`}
                className="size-12 shrink-0 rounded-full border border-line object-cover"
              />
            )}

            <span className="min-w-0 flex-1 truncate text-sm text-navy-900">
              {file.name}{' '}
              <span className="text-muted">({formatBytes(file.size)})</span>
            </span>

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="shrink-0 text-sm font-semibold text-navy-800 hover:underline"
            >
              Remove
            </button>
          </>
        ) : (
          <span className="text-sm text-muted">No file chosen</span>
        )}
      </div>

      {(error || hint) && (
        <p id={`${id}-note`} className={`mt-1.5 text-sm ${error ? 'text-red-700' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
