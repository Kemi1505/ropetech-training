'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ComponentType, ReactNode, useState } from 'react';
import { BadgeIcon, BookIcon, CardIcon, ChevronIcon, ClipboardIcon, CloseIcon, DashboardIcon, LogoutIcon, MenuIcon, ShieldIcon, UsersIcon } from '@/components/icons';
import Logo from '@/components/logo';
import { useLogout } from '@/lib/use-logout';

type Icon = ComponentType<{ className?: string }>;
interface Item {
  label: string;
  href: string;
  icon?: Icon;
  children?: { label: string; href: string }[];
  superadminOnly?: boolean;
}

const NAV: Item[] = [
  { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  {
    label: 'Courses',
    href: '/admin/courses',
    icon: BookIcon,
    children: [
      { label: 'Published courses', href: '/admin/courses?status=PUBLISHED' },
      { label: 'Unpublished courses', href: '/admin/courses?status=UNPUBLISHED' },
      { label: 'Add a new course', href: '/admin/courses/new' },
    ],
  },
  { label: 'Users', href: '/admin/users', icon: UsersIcon },
  {
    label: 'Admin',
    href: '/admin/admins',
    icon: ShieldIcon,
    superadminOnly: true,
    children: [
      { label: 'Create admin', href: '/admin/admins/create' },
      { label: 'Promote admin', href: '/admin/admins/promote' },
      { label: 'View all admins', href: '/admin/admins' },
    ],
  },
  { label: 'Enrollment', href: '/admin/enrollments', icon: ClipboardIcon },
  { label: 'Payments', href: '/admin/payments', icon: CardIcon },
  { label: 'Certification', href: '/admin/certifications', icon: BadgeIcon },
];

export default function AdminShell({ name, role, children }: { name: string; role: string; children: ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const { logout, loading } = useLogout();
  const [open, setOpen] = useState(false); // phone drawer
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const here = pathname + (search.toString() ? `?${search.toString()}` : '');
  const inSection = (item: Item) => (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href));
  const subActive = (href: string) => (href.includes('?') ? here.startsWith(href) : pathname === href);

  const items = NAV.filter((i) => !i.superadminOnly || role === 'SUPERADMIN');

  return (
    <div className="min-h-screen bg-white">
      {/* phone top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 shadow-sm shadow-brand-900/5 lg:hidden">
        <Logo />
        <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="rounded-full p-2 text-brand-700 hover:bg-brand-50">
          <MenuIcon />
        </button>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-brand-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        aria-label="Admin"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-alt transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-brand-500 hover:bg-brand-100 lg:hidden">
            <CloseIcon className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon!;
            const active = inSection(item);
            const isOpen = item.children ? (expanded[item.label] ?? active) : false;
            const base = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
            const look = active ? 'bg-brand-700 text-white' : 'text-brand-800 hover:bg-brand-100';

            return (
              <div key={item.label}>
                {item.children ? (
                  <button type="button" aria-expanded={isOpen} onClick={() => setExpanded((e) => ({ ...e, [item.label]: !isOpen }))} className={`${base} ${look}`}>
                    <Icon className="size-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronIcon dir={isOpen ? 'up' : 'down'} />
                  </button>
                ) : (
                  <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className={`${base} ${look}`}>
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                )}
                {item.children && isOpen && (
                  <ul className="mt-1 space-y-0.5 pl-11">
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          onClick={() => setOpen(false)}
                          className={`block rounded-md px-2 py-1.5 text-sm ${subActive(c.href) ? 'font-semibold text-brand-700' : 'text-brand-500 hover:text-brand-800'}`}
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 border-t border-brand-100 px-3 py-3">
          <Link href="/profile" onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 hover:bg-brand-100">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">{name[0]?.toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-brand-800">{name}</span>
              <span className="block text-xs text-brand-500">{role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}</span>
            </span>
          </Link>
          <button type="button" onClick={logout} disabled={loading} aria-label="Log out" title="Log out" className="rounded-full p-2 text-brand-500 hover:bg-brand-100 hover:text-brand-800 disabled:opacity-50">
            <LogoutIcon className="size-5" />
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
