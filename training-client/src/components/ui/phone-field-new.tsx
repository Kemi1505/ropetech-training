'use client';

import { CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronIcon, SearchIcon } from '@/components/icons';
import type { PhoneValue } from '@/lib/phone';

// Special territories that have no flag image
const SKIP = new Set(['AC', 'TA']);

interface CountryOption {
  code: CountryCode;
  name: string;
  dial: string;
}

// Flag emoji do not render on Windows, so flags are small images
function Flag({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      width={24}
      height={18}
      alt=""
      loading="lazy"
      className="h-[18px] w-6 shrink-0 rounded-[2px] bg-brand-100 object-cover"
    />
  );
}

const box =
  'h-11 border bg-white text-sm text-black focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface-alt';

/** Phone number in two parts: a searchable country-code list with flags, and the number. */
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
    ? countries.filter((c) => c.name.toLowerCase().includes(q) || c.dial.slice(1).startsWith(q) || c.code.toLowerCase() === q)
    : countries;

  function pick(code: CountryCode) {
    onChange({ country: code, national: value.national });
    setOpen(false);
    setQuery('');
    numberRef.current?.focus();
  }

  const border = error ? 'border-red-400' : 'border-brand-200';

  return (
    <div>
      <span id={`${id}-label`} className="mb-1.5 block text-sm font-medium text-brand-800">
        {label}
      </span>
      <div ref={wrapRef} role="group" aria-labelledby={`${id}-label`} className="relative flex">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code: ${selected.name} ${selected.dial}`}
          onClick={() => setOpen((o) => !o)}
          className={`${box} ${border} flex shrink-0 items-center gap-2 rounded-l-md border-r-0 px-3`}
        >
          <Flag code={selected.code} />
          <span className="tabular-nums">{selected.dial}</span>
          <ChevronIcon className="size-4 text-brand-500" />
        </button>

        <input
          ref={numberRef}
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
          className={`${box} ${border} min-w-0 flex-1 rounded-r-md px-3.5 placeholder:text-brand-400`}
        />

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-lg bg-white shadow-lg shadow-brand-900/15">
            <div className="relative border-b border-brand-100 p-2">
              <SearchIcon className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-brand-400" />
              <input
                ref={searchRef}
                type="search"
                aria-label="Search countries"
                placeholder="Search country or code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full rounded-md bg-surface-alt pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50 ${c.code === value.country ? 'bg-brand-50 font-semibold' : ''}`}
                  >
                    <Flag code={c.code} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-brand-500">{c.dial}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-3 py-3 text-sm text-brand-500">No matches</li>}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}