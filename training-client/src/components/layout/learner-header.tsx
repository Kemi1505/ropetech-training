'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BellIcon, CartIcon, ChevronIcon, CloseIcon, MenuIcon } from '@/components/icons';
import Logo from '@/components/logo';
import { useLogout } from '@/lib/use-logout';

const NAV = [
  { href: '/courses', label: 'Courses' },
  { href: '/certificates', label: 'Certificates' },
  { href: '/help', label: 'Help' },
];

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
      {n > 9 ? '9+' : n}
    </span>
  );
}

export default function LearnerHeader({
  firstName,
  fullName,
  unpaidCount,
  unreadCount,
}: {
  firstName: string;
  fullName: string;
  unpaidCount: number; // courses awaiting payment: shown on the cart
  unreadCount: number; // unread notifications: shown on the bell
}) {
  const pathname = usePathname();
  const { logout, loading } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false); // profile dropdown
  const [navOpen, setNavOpen] = useState(false); // phone navigation
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navLink = (href: string) =>
    isActive(href) ? 'font-semibold text-brand-700' : 'text-black hover:text-brand-500';
  const iconLink = 'relative inline-flex rounded-full p-2 text-brand-700 hover:bg-brand-50';
  const menuItem = 'block w-full px-4 py-2.5 text-left text-sm font-medium text-black hover:bg-brand-50';

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 items-center px-6 py-3 md:grid-cols-3">
        <Logo />

        <nav aria-label="Main" className="hidden items-center justify-center gap-8 text-sm md:flex">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? 'page' : undefined} className={navLink(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1">
          <Link
            href="/enrollments"
            className={iconLink}
            aria-label={unpaidCount > 0 ? `Enrollments, ${unpaidCount} awaiting payment` : 'Enrollments'}
          >
            <CartIcon />
            <CountBadge n={unpaidCount} />
          </Link>
          <Link
            href="/notifications"
            className={iconLink}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <BellIcon />
            <CountBadge n={unreadCount} />
          </Link>

          <div ref={menuRef} className="relative ml-2">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <span className="max-w-28 truncate">{firstName}</span>
              <ChevronIcon dir={menuOpen ? 'up' : 'down'} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-lg bg-white shadow-lg shadow-brand-900/15"
              >
        
                <Link role="menuitem" href="/dashboard" onClick={() => setMenuOpen(false)} 
                className={`${menuItem} truncate px-4 py-3 text-sm font-semibold text-brand-800`}>
                    {fullName}
                  </Link>
                <div className="border-t border-brand-100 py-1">
                  <Link role="menuitem" href="/profile" onClick={() => setMenuOpen(false)} className={menuItem}>
                    Profile
                  </Link>
                  <Link role="menuitem" href="/my-courses" onClick={() => setMenuOpen(false)} className={menuItem}>
                    My courses
                  </Link>
                </div>
                <div className="border-t border-brand-100 py-1">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={logout}
                    disabled={loading}
                    className={`${menuItem} text-red-600 disabled:opacity-50`}
                  >
                    {loading ? 'Logging out…' : 'Log out'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((o) => !o)}
            className="ml-1 rounded-full p-2 text-brand-700 hover:bg-brand-50 md:hidden"
          >
            {navOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {navOpen && (
        <nav aria-label="Main" className="border-t border-brand-100 px-6 py-2 md:hidden">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setNavOpen(false)}
              className={`block py-3 text-sm ${navLink(l.href)}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
