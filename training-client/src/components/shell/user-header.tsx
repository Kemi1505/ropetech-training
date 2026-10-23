'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/logo';
import Avatar from './avatar';
import { ChevronIcon, CloseIcon, MenuIcon } from './icons';
import { useLogout } from '@/lib/use-logout';

export interface Person {
  fullName: string;
  firstName: string;
  email: string;
  pictureUrl: string | null;
}

const LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/help', label: 'Help' },
  { href: '/enrollments', label: 'Enrollment' },
];

function ProfileMenu({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { logout, loading } = useLogout();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  const item = 'block w-full px-4 py-2.5 text-left text-[15px] font-medium text-navy-900 hover:bg-surface';

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-surface"
      >
        <Avatar name={person.fullName} src={person.pictureUrl} />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-navy-900 sm:block">{person.firstName}</span>
        <ChevronIcon className="size-4 text-muted" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold text-navy-900">{person.fullName}</p>
            <p className="truncate text-sm text-muted">{person.email}</p>
          </div>
          <div className="py-1">
            <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={item}>
              Profile
            </Link>
            <Link role="menuitem" href="/my-courses" onClick={() => setOpen(false)} className={item}>
              My courses
            </Link>
            <button role="menuitem" type="button" onClick={logout} disabled={loading} className={`${item} disabled:opacity-60`}>
              {loading ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserHeader({ person }: { person: Person }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-stretch gap-10">
          <div className="flex items-center">
            <Logo tone="dark" />
          </div>
          <nav aria-label="Main" className="hidden items-stretch gap-8 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? 'page' : undefined}
                className={`relative flex items-center text-[15px] font-semibold hover:text-navy-900 ${
                  isActive(l.href)
                    ? 'text-navy-900 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-accent'
                    : 'text-navy-900/70'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ProfileMenu person={person} />
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 text-navy-900 md:hidden"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Main" className="border-t border-line bg-white px-4 py-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`block border-l-[3px] px-3 py-3 text-base font-semibold ${
                isActive(l.href) ? 'border-accent text-navy-900' : 'border-transparent text-navy-900/70'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
