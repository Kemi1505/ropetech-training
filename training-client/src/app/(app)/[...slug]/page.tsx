import Link from 'next/link';

// Placeholder for pages that are linked from the navigation but not built yet.
// Real pages (e.g. src/app/(app)/profile/page.tsx) take priority over this catch-all.
export default function NotBuiltYet() {
  return (
    <div className="border border-line bg-white p-10 shadow-sm">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-navy-900">Coming soon</h1>
      <p className="mt-2 text-base text-muted">This page hasn&rsquo;t been built yet.</p>
      <Link href="/dashboard" className="mt-6 inline-block font-semibold text-navy-800 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
