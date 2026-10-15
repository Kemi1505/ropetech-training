// 'use client';

// import { InputHTMLAttributes, ReactNode, useId, useState } from 'react';

// const inputBase =
//   'h-12 w-full rounded-sm border bg-white px-4 text-base text-navy-900 placeholder:text-muted/70 ' +
//   'focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/20 disabled:bg-surface';

// type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
//   label: string;
//   error?: string;
//   hint?: string;
//   labelAside?: ReactNode;
//   trailing?: ReactNode;
// };

// export function TextField({ label, error, hint, labelAside, trailing, ...input }: TextFieldProps) {
//   const id = useId();
//   const noteId = `${id}-note`;

//   return (
//     <div>
//       <div className="mb-1.5 flex items-baseline justify-between">
//         <label htmlFor={id} className="text-sm font-semibold text-navy-900">
//           {label}
//         </label>
//         {labelAside}
//       </div>
//       <div className="relative">
//         <input
//           id={id}
//           aria-invalid={error ? true : undefined}
//           aria-describedby={error || hint ? noteId : undefined}
//           {...input}
//           className={`${inputBase} ${error ? 'border-red-600' : 'border-line'} ${trailing ? 'pr-20' : ''}`}
//         />
//         {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>}
//       </div>
//       {(error || hint) && (
//         <p id={noteId} className={`mt-1.5 text-sm ${error ? 'text-red-700' : 'text-muted'}`}>
//           {error ?? hint}
//         </p>
//       )}
//     </div>
//   );
// }

// export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
//   const [visible, setVisible] = useState(false);
//   return (
//     <TextField
//       {...props}
//       type={visible ? 'text' : 'password'}
//       trailing={
//         <button
//           type="button"
//           onClick={() => setVisible((v) => !v)}
//           aria-pressed={visible}
//           className="px-2 py-1 text-sm font-semibold text-navy-800 hover:text-navy-950 focus-visible:outline-2 focus-visible:outline-navy-900"
//         >
//           {visible ? 'Hide' : 'Show'}
//         </button>
//       }
//     />
//   );
// }

// export function FormAlert({ message }: { message: string | null }) {
//   if (!message) return null;
//   return (
//     <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
//       {message}
//     </div>
//   );
// }

// export function SubmitButton({
//   loading,
//   children,
//   loadingText,
// }: {
//   loading: boolean;
//   children: ReactNode;
//   loadingText: string;
// }) {
//   return (
//     <button
//       type="submit"
//       disabled={loading}
//       className="h-12 w-full rounded-sm bg-accent font-display text-xl font-bold uppercase tracking-wider text-navy-900 transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
//     >
//       {loading ? loadingText : children}
//     </button>
//   );
// }




'use client';

import {
  InputHTMLAttributes,
  ReactNode,
  useId,
  useState,
} from 'react';

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string;
  hint?: string;
  labelAside?: ReactNode;
  trailing?: ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  labelAside,
  trailing,
  ...input
}: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-brand-black"
        >
          {label}
        </label>
        {labelAside}
      </div>

      <div className="relative mt-1">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          {...input}
          className={`w-full rounded-md border px-3 py-2 text-sm text-brand-800 placeholder:text-brand-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 ${
            error ? 'border-red-500' : 'border-brand-200'
          } ${trailing ? 'pr-16' : ''}`}
        />

        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {trailing}
          </div>
        )}
      </div>

      {(error || hint) && (
        <p
          id={noteId}
          className={`mt-1 text-xs ${
            error ? 'text-red-600' : 'text-brand-500'
          }`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(
  props: Omit<TextFieldProps, 'type' | 'trailing'>,
) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          className="text-xs font-semibold text-brand-700 hover:text-brand-500"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}

export function FormAlert({ 
  message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </div>
  );
}



export function SubmitButton({
  loading,
  children,
  loadingText,
}: {
  loading: boolean;
  children: ReactNode;
  loadingText: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? loadingText : children}
    </button>
  );
}