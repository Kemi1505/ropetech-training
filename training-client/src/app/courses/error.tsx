'use client';

import { Button } from '@/components/button';

export default function CoursesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-brand-800">We couldn&rsquo;t load the courses</h1>
      <p className="mt-2 text-brand-500">Check your connection and try again.</p>
      <Button pill className="mt-6" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
