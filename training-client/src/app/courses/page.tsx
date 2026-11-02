import type { Metadata } from 'next';
import ExploreCourses from '@/components/courses/explore-courses';
import { CourseSummary, MyCourse, Paginated } from '@/lib/course-types';
import { publicApi } from '@/lib/public-api';
import { getViewer, tryApi } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Courses' };

const PAGE_SIZE = 9;

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const search = (q ?? '').trim().slice(0, 100);

  const session = await getViewer(`/courses${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  const learner = session?.profile ?? null;

  const params = new URLSearchParams({ page: '1', limit: String(PAGE_SIZE) });
  if (search) params.set('search', search);

  const [courses, mine] = await Promise.all([
    publicApi<Paginated<CourseSummary>>(`/courses?${params}`),
    learner ? tryApi<Paginated<MyCourse>>('/me/courses?limit=100') : Promise.resolve(null),
  ]);

  // course id -> where this learner is with it, so enrolled courses show their state instead of "Enroll"
  const states = Object.fromEntries((mine?.data ?? []).map((c) => [c.courseId, c]));

  return (
    <ExploreCourses
      heading={learner ? `Hello ${learner.firstName}.` : 'Explore courses'}
      subheading={learner ? 'What would you like to learn today?' : 'Perfect curated curriculum for you.'}
      initial={courses ?? { data: [], meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 } }}
      initialQuery={search}
      states={states}
      pageSize={PAGE_SIZE}
    />
  );
}
