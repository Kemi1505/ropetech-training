import { ReactNode } from 'react';

/** A labelled control. The <label> wraps the control, so clicking the text focuses it. */
export function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-brand-800">{label}</span>
        {optional && <span className="text-xs text-brand-500">Optional</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-sm text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-brand-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700',
    info: 'bg-brand-50 text-brand-700',
  };
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}
