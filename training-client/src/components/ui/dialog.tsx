'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { CloseIcon } from '@/components/icons';

/**
 * A modal built on the browser's own <dialog> element: it traps focus, closes with Escape,
 * and dims the page behind it, with no extra library.
 */
export default function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // a click on the dimmed area
      }}
      aria-labelledby={titleId}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl bg-white p-0 shadow-2xl backdrop:bg-brand-900/50`}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold text-brand-800">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 rounded-full p-2 text-brand-500 hover:bg-brand-50">
              <CloseIcon className="size-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
