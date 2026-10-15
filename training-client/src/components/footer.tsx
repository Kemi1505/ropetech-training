import Link from 'next/link';
import  Logo  from './logo';

export function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-brand-500">
            Practical rigging &amp; lifting safety training, delivered by industry
            professionals.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-brand-800">Training</h3>
          <ul className="mt-3 space-y-2 text-sm text-brand-500">
            <li>
              <Link href="/courses" className="hover:text-brand-700">
                Explore Courses
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-brand-700">
                Get Started
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-brand-800">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-brand-500">
            <li>
              <Link href="/about" className="hover:text-brand-700">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-700">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-brand-800">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-brand-500">
            <li>
              <Link href="/privacy" className="hover:text-brand-700">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-700">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-100 py-6 text-center text-xs text-brand-400">
        © {new Date().getFullYear()} Ropetech Training. All rights reserved.
      </div>
    </footer>
  );
}
