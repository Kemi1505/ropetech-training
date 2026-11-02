import { BlockSkeleton } from '@/components/courses/course-skeletons';

export default function Loading() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <BlockSkeleton className="h-4 w-56" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <BlockSkeleton className="h-6 w-28 rounded-full" />
            <BlockSkeleton className="mt-4 h-10 w-3/4" />
            <BlockSkeleton className="mt-4 h-5 w-full" />
            <BlockSkeleton className="mt-8 aspect-video w-full rounded-lg" />
          </div>
          <BlockSkeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    </section>
  );
}
