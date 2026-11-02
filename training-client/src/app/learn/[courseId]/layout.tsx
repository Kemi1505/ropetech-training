import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Curriculum, isUuid } from '@/lib/course-types';
import { getCourse } from '@/lib/get-course';
import { getViewer, tryApi } from '@/lib/viewer';

/** A focused page for learning: a slim top bar, no site header or footer. */
export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!isUuid(courseId)) notFound();

  const session = await getViewer(`/learn/${courseId}`);
  if (!session) redirect(`/login?next=${encodeURIComponent(`/learn/${courseId}`)}`);
  if (!session.profile) redirect('/complete-profile');

  const [course, curriculum] = await Promise.all([getCourse(courseId), tryApi<Curriculum>(`/courses/${courseId}/curriculum`)]);
  // not enrolled or payment not approved: back to the course page, where payment is explained
  if (!curriculum || curriculum.locked) redirect(`/courses/${courseId}`);

  const { done, total, percent } = curriculum.progress;
  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="sticky top-0 z-20 bg-white shadow-sm shadow-brand-900/5">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <Link href={`/courses/${courseId}`} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-500">
            ← Back to course
          </Link>
          <p className="min-w-0 flex-1 truncate text-center font-semibold text-brand-800">{course?.name ?? 'Course'}</p>
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <span className="text-xs text-brand-500">
              {done} of {total} lessons · {percent}%
            </span>
            <div role="progressbar" aria-label="Course progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 w-32 rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand-700" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
