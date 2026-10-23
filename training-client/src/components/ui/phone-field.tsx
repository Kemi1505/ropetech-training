'use client';

import { CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PhoneValue } from '@/lib/phone';

// Special territories that have no flag image
const SKIP = new Set(['AC', 'TA']);

const box =
  'h-10 rounded-md border border-brand-200 bg-white px-3 text-sm text-brand-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60';

interface CountryOption {
  code: CountryCode;
  name: string;
  dial: string;
}

// Flag emoji don't render on Windows, so flags are small images
function Flag({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      width={24}
      height={18}
      alt=""
      loading="lazy"
      className="h-[18px] w-6 shrink-0 bg-line object-cover"
    />
  );
}

export default function PhoneField({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: PhoneValue;
  onChange: (v: PhoneValue) => void;
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);

  const countries = useMemo<CountryOption[]>(() => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return getCountries()
      .filter((c) => !SKIP.has(c))
      .map((code) => ({ code, name: names.of(code) ?? code, dial: `+${getCountryCallingCode(code)}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selected = countries.find((c) => c.code === value.country) ?? countries[0];

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase().replace(/^\+/, '');
  const filtered = q
    ? countries.filter(
        (c) => c.name.toLowerCase().includes(q) || c.dial.slice(1).startsWith(q) || c.code.toLowerCase() === q,
      )
    : countries;

  function pick(code: CountryCode) {
    onChange({ country: code, national: value.national });
    setOpen(false);
    setQuery('');
    numberRef.current?.focus();
  }

  const borderColor = error ? 'border-red-600' : 'border-line';

  return (
    <div>
      <span id={`${id}-label`} className="mb-1 block text-sm font-medium text-brand-black">
        {label}
      </span>
      
      <div ref={wrapRef} role="group" aria-labelledby={`${id}-label`} className="relative flex gap-2">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${selected.name} ${selected.dial}`}
          onClick={() => setOpen((o) => !o)}
          className={`${box} ${borderColor} flex shrink-0 items-center gap-2 rounded-l-sm  px-3`}
       
        >
          <Flag code={selected.code} />
          <span className="tabular-nums">{selected.dial}</span>
          <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        

        <input
          ref={numberRef}
          id={`${id}-number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="801 234 5678"
          aria-label={`${label} number`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          value={value.national}
          onChange={(e) => onChange({ country: value.country, national: e.target.value })}
          className={`${box} ${borderColor} min-w-0 flex-1 rounded-r-sm px-4 placeholder:text-muted/70`}
        />

        {open && (        
          <div className="absolute left-0 top-full z-20 mt-1 w-80 max-w-[calc(100vw-3rem)] rounded-sm border border-line bg-white shadow-lg">
            <div className="p-2">
              <input
                ref={searchRef}
                type="search"
                aria-label="Search countries"
                placeholder="Search country or code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full border border-line bg-white px-3 text-sm font-bold text-brand-800 placeholder:text-brand-500 focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700/20"
              />
            </div>

            <ul role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.code} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value.country}
                    onClick={() => pick(c.code)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface ${
                      c.code === value.country ? 'bg-surface font-semibold' : ''
                    }`}
                  >
                    <Flag code={c.code} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-muted">{c.dial}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-3 py-3 text-sm text-muted">No matches</li>}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
