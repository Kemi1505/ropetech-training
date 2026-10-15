import { ReactNode } from 'react';

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-navy-900">
        {title}
      </h1>

      <p className="mt-1 text-sm text-muted">
        {subtitle}
      </p>

      <div className="mt-8">
        {children}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {footer}
      </p>
    </div>
  );
}
