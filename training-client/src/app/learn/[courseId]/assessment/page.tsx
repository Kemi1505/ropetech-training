import type { Metadata } from 'next';
import { LinkButton } from '@/components/button';
import EmptyState from '@/components/courses/empty-state';
import { CheckIcon } from '@/components/icons';
import LearnerEnquiry from '@/components/enquiry/learner-enquiry';
import AssessmentTaker from '@/components/learn/assessment-taker';
import { AssessmentResult, AssessmentView } from '@/lib/app-types';
import { tryApi } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Assessment' };

const shell = 'mx-auto max-w-lg px-6 py-12';
const panel = 'rounded-lg bg-white p-8 text-center shadow-md shadow-brand-900/10';

export default async function AssessmentPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const view = await tryApi<AssessmentView>(`/courses/${courseId}/assessment`);

  if (!view) {
    return (
      <div className={shell}>
        <EmptyState
          title="This course has no assessment yet"
          text="Check back later."
          action={<LinkButton href={`/courses/${courseId}`} variant="soft" pill>Back to course</LinkButton>}
        />
      </div>
    );
  }

  if (view.blockedReason === 'PASSED') {
    const result = await tryApi<AssessmentResult>(`/courses/${courseId}/assessment/result`);
    return (
      <div className={shell}>
        <div className={panel}>
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-50 text-green-700">
            <CheckIcon className="size-8" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-brand-800">You passed!</h1>
          {result?.score !== undefined && <p className="mt-2 text-4xl font-bold text-green-700">{result.score}%</p>}
          <p className="mt-4 text-sm text-black">You are eligible for a certificate. You have now completed this course.</p>
          <div className="mt-7 space-y-3">
            <LinkButton href="/certificates" pill className="w-full py-3">View certificate</LinkButton>
            <LinkButton href={`/courses/${courseId}`} variant="soft" pill className="w-full py-3">Back to course</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  if (view.blockedReason === 'CONTENT_INCOMPLETE') {
    const pct = view.contentProgress.total ? Math.round((view.contentProgress.done / view.contentProgress.total) * 100) : 0;
    return (
      <div className={shell}>
        <div className={panel}>
          <h1 className="text-2xl font-bold text-brand-800">Assessment</h1>
          <p className="mt-2 text-sm text-brand-500">
            {view.totalQuestions} questions · pass mark {view.passMark}% · {view.maxAttempts} attempts
          </p>
          <div className="mt-6 flex justify-between text-sm font-semibold text-brand-800">
            <span>Lessons completed</span>
            <span>{view.contentProgress.done} of {view.contentProgress.total}</span>
          </div>
          <div role="progressbar" aria-label="Lessons completed" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2.5 rounded-full bg-brand-100">
            <div className="h-full rounded-full bg-brand-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-5 text-sm text-brand-500">Finish all lessons to unlock the assessment.</p>
          <LinkButton href={`/learn/${courseId}`} pill className="mt-6 w-full py-3">Continue lessons</LinkButton>
        </div>
      </div>
    );
  }

  if (view.blockedReason === 'NO_ATTEMPTS_LEFT') {
    return (
      <div className={shell}>
        <div className={panel}>
          <h1 className="text-2xl font-bold text-brand-800">No attempts left</h1>
          <p className="mt-3 text-sm text-black">You have used all {view.maxAttempts} attempts. Please contact an admin to get more.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <LearnerEnquiry label="Make an enquiry" variant="primary" />
            <LinkButton href={`/courses/${courseId}`} variant="soft" pill>Back to course</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <AssessmentTaker view={view} />
    </div>
  );
}
