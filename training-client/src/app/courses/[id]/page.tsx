import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LinkButton } from '@/components/button';
import AccessCard, { AccessState } from '@/components/courses/access-card';
import CourseContentList from '@/components/courses/course-content-list';
import CoursePicture from '@/components/courses/course-picture';
import PaymentDialog from '@/components/payment/payment-dialog';
import { PaymentInfo } from '@/lib/app-types';
import CourseGrid from '@/components/courses/course-grid';
import { CheckIcon, ChevronIcon } from '@/components/icons';
import {
  CourseDetail,
  CourseSummary,
  Curriculum,
  isUuid,
  lessonsLabel,
  MyCourse,
  MyEnrollment,
  Paginated,
} from '@/lib/course-types';
import { titleCase } from '@/lib/format';
import { publicApi } from '@/lib/public-api';
import { getViewer, tryApi } from '@/lib/viewer';

// cache(): the title and the page share one request instead of asking the API twice
const getCourse = cache((id: string) => publicApi<CourseDetail>(`/courses/${id}`));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: 'Course' };
  const course = await getCourse(id);
  return { title: course?.name ?? 'Course not found' };
}

function accessState(loggedIn: boolean, e: MyEnrollment | null): AccessState {
  if (!loggedIn) return 'GUEST';
  if (!e?.enrolled) return 'NOT_ENROLLED';
  if (e.paymentStatus === 'APPROVED') return e.assessmentPassed ? 'COMPLETED' : 'APPROVED';
  if (e.paymentStatus === 'PENDING') return 'PENDING';
  if (e.paymentStatus === 'REJECTED') return 'REJECTED';
  return 'UNPAID';
}

const h2 = 'text-2xl font-bold text-brand-800';

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pay?: string }>;
}) {
  const { id } = await params;
  const { pay } = await searchParams;
  if (!isUuid(id)) notFound();

  const session = await getViewer(`/courses/${id}${pay ? `?pay=${encodeURIComponent(pay)}` : ''}`);
  const learner = !!session?.profile;

  const [course, enrollment, curriculum, mine, others] = await Promise.all([
    getCourse(id),
    learner ? tryApi<MyEnrollment>(`/courses/${id}/my-enrollment`) : Promise.resolve(null),
    learner ? tryApi<Curriculum>(`/courses/${id}/curriculum`) : Promise.resolve(null),
    learner ? tryApi<Paginated<MyCourse>>('/me/courses?limit=100') : Promise.resolve(null),
    publicApi<CourseSummary[]>(`/courses/${id}/others`),
  ]);
  if (!course) notFound();

  const state = accessState(learner, enrollment);

  // ?pay=details|submit|status opens the payment dialog (only while payment is still open)
  const wantsDialog = ['details', 'submit', 'status'].includes(pay ?? '') && ['UNPAID', 'PENDING', 'REJECTED'].includes(state);
  const paymentInfo = wantsDialog ? await tryApi<PaymentInfo>(`/courses/${id}/payment`) : null;
  const states = Object.fromEntries((mine?.data ?? []).map((c) => [c.courseId, c]));
  const { assessment } = course;
  const lessonTotal = course.sections.reduce((n, s) => n + s.lessons.length, 0);
  const steps = [
    { n: '01', title: 'Complete', text: 'Finish all lessons' },
    {
      n: '02',
      title: 'Take assessment',
      text: assessment.passMark ? `${assessment.questionCount} questions, ${assessment.passMark}% to pass` : `${assessment.questionCount} questions`,
    },
    { n: '03', title: 'Pass', text: `Up to ${assessment.maxAttempts} attempts` },
    { n: '04', title: 'Get certified', text: 'Receive your certificate' },
  ];

  return (
    <>
      {/* hero: white */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-brand-500">
            <Link href="/courses" className="hover:text-brand-700">
              Courses
            </Link>
            <ChevronIcon dir="right" className="size-3.5" />
            <span className="truncate text-brand-800">{course.name}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
            <div>
              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {titleCase(course.difficulty)}
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-brand-800 sm:text-4xl">{course.name}</h1>
              <p className="mt-4 text-lg text-brand-700">{course.shortDescription}</p>
              <div className="relative mt-8 aspect-video overflow-hidden rounded-lg bg-brand-50">
                <CoursePicture pictureUrl={course.pictureUrl} sizes="(min-width: 1024px) 60vw, 100vw" priority />
              </div>
            </div>
            <div className="lg:sticky lg:top-24 lg:self-start">
              <AccessCard course={course} state={state} hasStarted={(curriculum?.progress.done ?? 0) > 0} />
            </div>
          </div>
        </div>
      </section>

      {/* overview: white */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-14">
          <h2 className={h2}>Course overview</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-black">
            {course.description.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* what you'll learn: tint */}
      {course.learningOutcomes.length > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <h2 className={h2}>What you&rsquo;ll learn</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {course.learningOutcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-white p-5 shadow-md shadow-brand-900/10">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <CheckIcon className="size-4" />
                  </span>
                  <span className="text-sm text-black">{o}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* requirements: white */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className={h2}>Course requirements</h2>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-brand-50 p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <CheckIcon className="size-5" />
              </span>
              {course.requiresPreviousCertification ? (
                <div>
                  <p className="font-semibold text-brand-800">
                    {course.certificationRequirement || 'A previous certification is required.'}
                  </p>
                  <p className="mt-1 text-sm text-brand-500">
                    We check your profile automatically. Upload your certification there if you have one.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-brand-800">No requirements</p>
                  <p className="mt-1 text-sm text-brand-500">This course is open to everyone.</p>
                </div>
              )}
            </div>
            {course.requiresPreviousCertification && learner && (
              <LinkButton href="/profile" variant="soft" pill>
                Go to profile
              </LinkButton>
            )}
          </div>
        </div>
      </section>

      {/* how certification works: tint */}
      {assessment.questionCount > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <h2 className={h2}>How certification works</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="rounded-lg bg-white p-6 shadow-md shadow-brand-900/10">
                  <span className="text-xl font-bold text-accent-600">{s.n}</span>
                  <p className="mt-2 font-semibold text-brand-800">{s.title}</p>
                  <p className="mt-1 text-sm text-brand-500">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* course content: white */}
      {course.sections.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={h2}>Course content</h2>
              <p className="text-sm text-brand-500">
                {course.sections.length} {course.sections.length === 1 ? 'section' : 'sections'} · {lessonsLabel(lessonTotal)}
              </p>
            </div>
            <div className="mt-6">
              <CourseContentList courseId={course.id} sections={course.sections} curriculum={curriculum} />
            </div>
          </div>
        </section>
      )}

      {/* assessment and certificate: tint */}
      {assessment.questionCount > 0 && (
        <section className="bg-surface-alt">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow-md shadow-brand-900/10">
              <h3 className="text-lg font-semibold text-brand-800">Assessment</h3>
              <ul className="mt-4 space-y-2 text-sm text-black">
                <li>{assessment.questionCount} multiple-choice questions</li>
                {assessment.passMark && <li>Pass mark: {assessment.passMark}%</li>}
                <li>Up to {assessment.maxAttempts} attempts</li>
                <li>Unlocks after you finish all lessons</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md shadow-brand-900/10">
              <h3 className="text-lg font-semibold text-brand-800">Certificate</h3>
              <ul className="mt-4 space-y-2 text-sm text-black">
                <li>Included with the course</li>
                <li>Issued when you pass the assessment</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {paymentInfo && (
        <PaymentDialog
          key={pay}
          info={paymentInfo}
          initialView={pay === 'submit' && (state === 'UNPAID' || state === 'REJECTED') ? 'submit' : pay === 'status' || state === 'PENDING' ? 'status' : 'details'}
        />
      )}

      {/* other courses: white */}
      {others && others.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className={h2}>Other courses</h2>
              <Link href="/courses" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
                View all →
              </Link>
            </div>
            <div className="mt-8">
              <CourseGrid courses={others} states={states} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
