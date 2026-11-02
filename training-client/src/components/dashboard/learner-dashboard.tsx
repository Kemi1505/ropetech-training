import Link from 'next/link';
import { LinkButton } from '@/components/button';
import CourseGrid from '@/components/courses/course-grid';
import CoursePicture from '@/components/courses/course-picture';
import EmptyState from '@/components/courses/empty-state';
import HelpBand from '@/components/enquiry/help-band';
import { h2 } from '@/components/ui/styles';
import { LearnerDashboard as Data } from '@/lib/app-types';
import { asCard, statesOf } from '@/lib/course-map';

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className={h2}>{title}</h2>
      <Link href={href} className="text-sm font-semibold text-brand-700 hover:text-brand-500">
        View all →
      </Link>
    </div>
  );
}

export default function LearnerDashboard({ data }: { data: Data }) {
  const name = data.firstName ?? '';
  const cl = data.continueLearning;

  // ----------------------------------------------------------------- new learner
  if (!data.hasEnrollments) {
    return (
      <>
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-14 pt-12">
            <h1 className="text-3xl font-bold text-brand-800 sm:text-4xl">Hello, {name}.</h1>
            <p className="mt-3 text-lg text-brand-700">Ready to start your training?</p>
            <LinkButton href="/courses" pill className="mt-6 px-8 py-3 text-base">
              Explore courses
            </LinkButton>
          </div>
        </section>
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <SectionTitle title="Featured courses" href="/courses" />
            <div className="mt-8">
              {data.featured.length > 0 ? (
                <CourseGrid courses={data.featured} />
              ) : (
                <EmptyState title="No courses yet, check back later" text="New courses will appear here as soon as they are published." />
              )}
            </div>
          </div>
        </section>
        <HelpBand />
      </>
    );
  }

  // ------------------------------------------------------------ returning learner
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-12">
          <h1 className="text-3xl font-bold text-brand-800 sm:text-4xl">Welcome back, {name}</h1>

          {cl && (
            <>
              <p className="mt-3 text-brand-500">{cl.kind === 'CONTINUE' ? 'Continue where you left off' : 'One more step to start learning'}</p>
              <div className="mt-6 grid gap-6 rounded-lg bg-surface-alt p-5 sm:grid-cols-[260px_1fr] sm:items-center">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-brand-50">
                  <CoursePicture pictureUrl={cl.course.pictureUrl} sizes="260px" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-brand-800">{cl.course.name}</h2>
                  {cl.kind === 'CONTINUE' ? (
                    <>
                      <p className="mt-2 text-sm text-brand-500">{cl.course.progress}% complete</p>
                      <div
                        role="progressbar"
                        aria-label={`${cl.course.name} progress`}
                        aria-valuenow={cl.course.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-2 h-2.5 rounded-full bg-brand-100"
                      >
                        <div className="h-full rounded-full bg-brand-700" style={{ width: `${cl.course.progress}%` }} />
                      </div>
                      <LinkButton href={cl.nextLessonId ? `/learn/${cl.course.courseId}/${cl.nextLessonId}` : `/learn/${cl.course.courseId}`} pill className="mt-5 px-7 py-3">
                        Continue learning
                      </LinkButton>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-brand-500">Complete your payment to unlock this course.</p>
                      <LinkButton href={`/courses/${cl.course.courseId}?pay=details`} variant="accent" pill className="mt-5 px-7 py-3">
                        Make payment
                      </LinkButton>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-14">
          <SectionTitle title="My courses" href="/my-courses" />
          <div className="mt-8">
            <CourseGrid courses={data.myCourses.map(asCard)} states={statesOf(data.myCourses)} />
          </div>
        </div>
      </section>

      {data.explore.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <SectionTitle title="Explore more courses" href="/courses" />
            <div className="mt-8">
              <CourseGrid courses={data.explore} />
            </div>
          </div>
        </section>
      )}

      <HelpBand />
    </>
  );
}
