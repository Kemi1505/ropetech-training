import { LinkButton } from '@/components/button';

export default function CourseNotFound() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-brand-800">Course not found</h1>
      <p className="mt-2 text-brand-500">It may have been removed or is not available yet.</p>
      <LinkButton href="/courses" pill className="mt-6">
        Browse courses
      </LinkButton>
    </section>
  );
}
