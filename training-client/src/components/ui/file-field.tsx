'use client';

import { useId, useRef } from 'react';
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

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-brand-800">
          {label}
        </label>
        {optional && <span className="text-xs text-brand-500">Optional</span>}
      </div>

      <div className={`flex items-center gap-3 rounded-md border border-dashed bg-brand-50/60 p-3 ${error ? 'border-red-400' : 'border-brand-300'}`}>
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
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500"
        >
          {file ? 'Change file' : 'Choose file'}
        </label>
        {file ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm text-black">
              {file.name} <span className="text-brand-500">({formatBytes(file.size)})</span>
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="text-sm font-semibold text-brand-700 hover:text-brand-500"
            >
              Remove
            </button>
          </>
        ) : (
          <span className="text-sm text-brand-500">No file chosen</span>
        )}
      </div>

      {(error || hint) && (
        <p id={`${id}-note`} className={`mt-1.5 text-xs ${error ? 'text-red-600' : 'text-brand-500'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
