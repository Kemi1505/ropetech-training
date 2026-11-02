import Link from 'next/link';
import { LinkButton } from '@/components/button';
import Logo from '@/components/logo';

/** The landing page header, as a component, for visitors who are not logged in. */
export default function PublicHeader({ active }: { active?: 'courses' | 'about' | 'contact' }) {
  const link = (current: boolean) => (current ? 'text-brand-700' : 'hover:text-brand-500');
  return (
    <header className="border-b border-brand-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 items-center px-6 py-4 md:grid-cols-3">
        <Logo />
        <nav className="hidden items-center justify-center gap-8 text-sm font-medium text-black md:flex">
          <Link href="/courses" className={link(active === 'courses')}>
            Courses
          </Link>
          <Link href="/about" className={link(active === 'about')}>
            About
          </Link>
          <Link href="/contact" className={link(active === 'contact')}>
            Contact
          </Link>
        </nav>
        <div className="flex items-center justify-end gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-brand-700 hover:text-brand-500">
            Log in
          </Link>
          <LinkButton href="/signup" pill className="px-5 py-2 text-sm">
            Get Started
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
