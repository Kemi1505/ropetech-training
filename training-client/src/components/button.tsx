import Link from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'accent' | 'outline';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-600',
  accent: 'bg-accent-500 text-white hover:bg-accent-600',
  outline: 'border border-brand-700 text-brand-700 hover:bg-brand-50',
};

const base =
  'inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

type SharedProps = { variant?: Variant; pill?: boolean };

function shapeClass(pill?: boolean) {
  return pill ? 'rounded-full' : 'rounded-md';
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & SharedProps;

export function Button({ variant = 'primary', pill, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${base} ${shapeClass(pill)} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  pill,
  className = '',
  children,
}: {
  href: string;
  variant?: Variant;
  pill?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${base} ${shapeClass(pill)} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
