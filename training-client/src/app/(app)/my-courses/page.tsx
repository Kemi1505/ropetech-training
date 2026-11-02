import type { Metadata } from 'next';
import { LinkButton } from '@/components/button';
import CourseGrid from '@/components/courses/course-grid';
import EmptyState from '@/components/courses/empty-state';
import LinkTabs from '@/components/ui/link-tabs';
import { h1 } from '@/components/ui/styles';
import { MyCourseItem } from '@/lib/app-types';
import { asCard, statesOf } from '@/lib/course-map';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'My courses' };

type Filter = 'all' | 'in-progress' | 'completed';

export default async function MyCoursesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: raw } = await searchParams;
  const filter: Filter = raw === 'in-progress' || raw === 'completed' ? raw : 'all';

  const res = await serverApi<{ data: MyCourseItem[]; counts: { all: number; inProgress: number; completed: number } }>(
    `/me/courses?filter=${filter}&limit=100`,
  );
  const items = res?.data ?? [];
  const counts = res?.counts ?? { all: 0, inProgress: 0, completed: 0 };

  const empty =
    filter === 'in-progress'
      ? { title: 'Nothing in progress', text: 'Courses you have started will appear here.' }
      : filter === 'completed'
        ? { title: 'No completed courses yet', text: 'Pass a course assessment and it will appear here.' }
        : { title: 'You have not enrolled in any course yet', text: 'Find a course and enroll to get started.' };

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <h1 className={h1}>My courses</h1>
      <div className="mt-6">
        <LinkTabs
          items={[
            { label: 'All courses', href: '/my-courses', active: filter === 'all', count: counts.all },
            { label: 'In progress', href: '/my-courses?filter=in-progress', active: filter === 'in-progress', count: counts.inProgress },
            { label: 'Completed', href: '/my-courses?filter=completed', active: filter === 'completed', count: counts.completed },
          ]}
        />
      </div>
      <div className="mt-8">
        {items.length > 0 ? (
          <CourseGrid courses={items.map(asCard)} states={statesOf(items)} />
        ) : (
          <EmptyState
            title={empty.title}
            text={empty.text}
            action={
              <LinkButton href="/courses" pill>
                Explore courses
              </LinkButton>
            }
          />
        )}
      </div>
    </section>
  );
}
