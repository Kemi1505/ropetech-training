import { BlockSkeleton, CourseGridSkeleton } from '@/components/courses/course-skeletons';

// Shown instantly while the server fetches the courses
export default function Loading() {
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-10 pt-12">
          <BlockSkeleton className="h-9 w-64" />
          <BlockSkeleton className="mt-3 h-4 w-80" />
          <BlockSkeleton className="mt-6 h-11 w-full max-w-xl rounded-md" />
        </div>
      </section>
      <section className="bg-surface-alt">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <BlockSkeleton className="h-7 w-40" />
          <div className="mt-8">
            <CourseGridSkeleton />
          </div>
        </div>
      </section>
    </>
  );
}
