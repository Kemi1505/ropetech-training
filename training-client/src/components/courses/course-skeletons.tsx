const pulse = 'animate-pulse motion-reduce:animate-none rounded bg-brand-100/70';

/** Same size and shape as a real card, so nothing jumps when the courses arrive. */
export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md shadow-brand-900/10" aria-hidden="true">
      <div className={`aspect-[16/10] rounded-none ${pulse}`} />
      <div className="p-5">
        <div className={`h-4 w-2/3 ${pulse}`} />
        <div className={`mt-3 h-3 w-full ${pulse}`} />
        <div className={`mt-2 h-3 w-4/5 ${pulse}`} />
        <div className={`mt-4 h-3 w-1/4 ${pulse}`} />
        <div className="mt-6 flex items-center justify-between">
          <div className={`h-5 w-20 ${pulse}`} />
          <div className={`h-9 w-24 rounded-full ${pulse}`} />
        </div>
      </div>
    </div>
  );
}

export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading courses" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading courses…</span>
    </div>
  );
}

export function BlockSkeleton({ className = '' }: { className?: string }) {
  return <div className={`${pulse} ${className}`} aria-hidden="true" />;
}
