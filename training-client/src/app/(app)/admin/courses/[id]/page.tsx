import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AssessmentStep from '@/components/admin/course-editor/assessment-step';
import BasicStep from '@/components/admin/course-editor/basic-step';
import ContentStep from '@/components/admin/course-editor/content-steps';
import OutcomesStep from '@/components/admin/course-editor/outcomes-step';
import RequirementsStep from '@/components/admin/course-editor/requirements-step';
import ReviewStep from '@/components/admin/course-editor/review-step';
import Stepper, { STEPS, StepKey } from '@/components/admin/course-editor/stepper';
import StatusChip from '@/components/courses/status-chip';
import { AssessmentAdmin, CourseSetup, EditorCourse, Outline } from '@/lib/app-types';
import { isUuid } from '@/lib/course-types';
import { getSession, serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Edit course' };

const STATUS = {
  DRAFT: { kind: 'draft', label: 'Draft' },
  PUBLISHED: { kind: 'done', label: 'Published' },
  UNPUBLISHED: { kind: 'unpublished', label: 'Unpublished' },
} as const;

/**
 * One page for building and editing a course. The steps are links (?step=content ...), so an admin can
 * leave a draft and come back to exactly where it was. With no ?step it opens at the next unfinished one.
 */
export default async function CourseEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step } = await searchParams;
  if (!isUuid(id)) notFound();

  const [course, setup, session] = await Promise.all([
    serverApi<EditorCourse>(`/admin/courses/${id}/preview`), // the admin's copy of the course page, with every field
    serverApi<CourseSetup>(`/admin/courses/${id}/setup`),
    getSession(),
  ]);
  if (!course || !setup) notFound();

  const keys = STEPS.map((s) => s.key) as readonly string[];
  const current = (keys.includes(step ?? '') ? step : (setup.nextStep ?? 'review')) as StepKey;
  const position = keys.indexOf(current) + 1;

  // only load what the current step needs
  const [outline, assessment] = await Promise.all([
    current === 'content' ? serverApi<Outline>(`/admin/courses/${id}/outline`) : Promise.resolve(null),
    current === 'assessment' ? serverApi<AssessmentAdmin>(`/admin/courses/${id}/assessment`) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/courses" className="text-sm font-semibold text-brand-700 hover:text-brand-500">← Courses</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-brand-800">{course.name}</h1>
        <StatusChip kind={STATUS[setup.status].kind}>{STATUS[setup.status].label}</StatusChip>
      </div>

      <div className="mt-8"><Stepper courseId={id} current={current} setup={setup} /></div>

      <div className="mt-8 rounded-lg bg-white p-8 shadow-md shadow-brand-900/10">
        <h2 className="mb-6 text-xl font-bold text-brand-800">
          {STEPS[position - 1].label} <span className="text-sm font-medium text-brand-500">· Step {position} of {STEPS.length}</span>
        </h2>
        {current === 'basic' && <BasicStep course={course} />}
        {current === 'content' && outline && <ContentStep courseId={id} outline={outline} />}
        {current === 'outcomes' && <OutcomesStep courseId={id} initial={course.learningOutcomes} />}
        {current === 'requirements' && <RequirementsStep courseId={id} requires={course.requiresPreviousCertification} text={course.certificationRequirement} />}
        {current === 'assessment' && assessment && <AssessmentStep courseId={id} data={assessment} />}
        {current === 'review' && <ReviewStep course={course} setup={setup} isSuperadmin={session?.user.role === 'SUPERADMIN'} />}
      </div>
    </div>
  );
}
