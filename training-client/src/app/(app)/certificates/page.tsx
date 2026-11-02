import type { Metadata } from 'next';
import { LinkButton } from '@/components/button';
import EmptyState from '@/components/courses/empty-state';
import { h1 } from '@/components/ui/styles';

export const metadata: Metadata = { title: 'Certificates' };

export default function CertificatesPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={h1}>Certificates</h1>
      <div className="mt-8">
        <EmptyState
          title="Certificates are coming soon"
          text="When you pass a course assessment you become eligible for a certificate. It will appear here once certificates are available."
          action={
            <LinkButton href="/my-courses" variant="soft" pill>
              Go to my courses
            </LinkButton>
          }
        />
      </div>
    </section>
  );
}
