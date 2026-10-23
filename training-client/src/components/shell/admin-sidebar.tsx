'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentType, useState } from 'react';
import Logo from '@/components/logo';
import { useLogout } from '@/lib/use-logout';
import Avatar from './avatar';
import { BadgeIcon, BookIcon, CardIcon, CloseIcon, DashboardIcon, LogoutIcon, MenuIcon, UsersIcon } from './icons';
import type { Person } from './user-header';

const NAV: { href: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/admin/courses', label: 'Courses', Icon: BookIcon },
  { href: '/admin/enrollments', label: 'Enrollment', Icon: UsersIcon },
  { href: '/admin/payments', label: 'Payments', Icon: CardIcon },
  { href: '/admin/certifications', label: 'Certification', Icon: BadgeIcon },
];

export default function AdminSidebar({ person }: { person: Person }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { logout, loading } = useLogout();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const row =
    'flex w-full items-center gap-3 border-l-[3px] px-4 py-2.5 text-[15px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white';

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-navy-900 px-4 lg:hidden">
        <Logo tone="light" />
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="p-2 text-white"
        >
          <MenuIcon />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        aria-label="Admin"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <Logo tone="light" />
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="p-1 text-white/80 lg:hidden">
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-1 py-2">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={isActive(href) ? 'page' : undefined}
              className={`${row} ${
                isActive(href)
                  ? 'border-accent bg-white/10 text-white'
                  : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 py-3">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={`${row} ${isActive('/profile') ? 'border-accent bg-white/10' : 'border-transparent hover:bg-white/5'}`}
          >
            <Avatar name={person.fullName} src={person.pictureUrl} size={32} />
            <span className="min-w-0 truncate font-semibold">{person.fullName}</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className={`${row} border-transparent text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-60`}
          >
            <LogoutIcon />
            {loading ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>
    </>
  );
}
