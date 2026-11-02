import { LinkButton } from '@/components/button';
import { CheckIcon, ClockIcon, DocIcon } from '@/components/icons';
import { formatPrice } from '@/lib/format';
import { CourseDetail, resourcesLabel } from '@/lib/course-types';
import EnrollButton from './enroll-button';

export type AccessState = 'GUEST' | 'NOT_ENROLLED' | 'UNPAID' | 'PENDING' | 'REJECTED' | 'APPROVED' | 'COMPLETED';

const label = 'text-xs font-semibold uppercase tracking-wide text-brand-500';
const card = 'overflow-hidden rounded-lg bg-white p-6 shadow-lg shadow-brand-900/10';

function Included({ course }: { course: CourseDetail }) {
  const items = [
    { icon: <DocIcon className="size-5" />, text: resourcesLabel(course.lessonCount) },
    ...(course.assessment.questionCount > 0 ? [{ icon: <CheckIcon className="size-5" />, text: 'Assessment' }] : []),
    { icon: <CheckIcon className="size-5" />, text: 'Self-paced' },
    { icon: <CheckIcon className="size-5" />, text: 'Certificate included' },
  ];
  return (
    <ul className="mt-5 space-y-3">
      {items.map((i) => (
        <li key={i.text} className="flex items-center gap-3 text-sm text-black">
          <span className="text-brand-500">{i.icon}</span>
          {i.text}
        </li>
      ))}
    </ul>
  );
}

/** The card next to the course picture. Enrollment does not equal access, so it has six states. */
export default function AccessCard({
  course,
  state,
  hasStarted,
}: {
  course: CourseDetail;
  state: AccessState;
  hasStarted: boolean;
}) {
  const id = course.id;

  // ---- not enrolled (or not logged in)
  if (state === 'GUEST' || state === 'NOT_ENROLLED') {
    return (
      <aside className={card}>
        <p className={label}>Course access</p>
        <p className="mt-3 text-3xl font-bold text-brand-800">{formatPrice(course.price)}</p>
        <Included course={course} />
        <div className="mt-6">
          {state === 'GUEST' ? (
            <LinkButton href={`/login?next=${encodeURIComponent(`/courses/${id}`)}`} pill className="w-full py-3 text-base">
              Enroll in Course
            </LinkButton>
          ) : (
            <EnrollButton courseId={id} />
          )}
        </div>
        <p className="mt-3 text-center text-xs text-brand-500">
          {course.requiresPreviousCertification
            ? 'Needs an approved previous certification. You pay by bank transfer after enrolling.'
            : 'You pay by bank transfer after enrolling.'}
        </p>
      </aside>
    );
  }

  // ---- enrolled, payment not submitted
  if (state === 'UNPAID') {
    return (
      <aside className={card}>
        <p className={label}>Enrollment</p>
        <p className="mt-4 flex items-center gap-2 font-semibold text-brand-800">
          <span className="flex size-6 items-center justify-center rounded-full bg-green-50 text-green-700">
            <CheckIcon className="size-4" />
          </span>
          You are enrolled
        </p>
        <p className="mt-3 text-sm font-semibold text-accent-600">Payment required</p>
        <p className="mt-1 text-sm text-brand-500">Pay {formatPrice(course.price)} by bank transfer to unlock the course.</p>
        <div className="mt-6 space-y-3">
          <LinkButton href={`/courses/${id}?pay=details`} variant="soft" pill className="w-full py-3">
            View Payment Details
          </LinkButton>
          <LinkButton href={`/courses/${id}?pay=submit`} pill className="w-full py-3">
            Submit Payment
          </LinkButton>
        </div>
      </aside>
    );
  }

  // ---- payment submitted, waiting for an admin
  if (state === 'PENDING') {
    return (
      <aside className={card}>
        <p className={label}>Payment status</p>
        <p className="mt-4 flex items-center gap-2 font-semibold text-brand-800">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <ClockIcon className="size-4" />
          </span>
          Verification pending
        </p>
        <p className="mt-3 text-sm text-brand-500">Your payment confirmation is being reviewed. You will be notified when it is approved.</p>
        <div className="mt-6">
          <LinkButton href={`/courses/${id}?pay=status`} variant="soft" pill className="w-full py-3">
            View Status
          </LinkButton>
        </div>
      </aside>
    );
  }

  // ---- payment rejected
  if (state === 'REJECTED') {
    return (
      <aside className={card}>
        <p className={label}>Payment status</p>
        <p className="mt-4 font-semibold text-red-600">Payment not approved</p>
        <p className="mt-2 text-sm text-brand-500">Check the details and submit your payment again.</p>
        <div className="mt-6 space-y-3">
          <LinkButton href={`/courses/${id}?pay=details`} variant="soft" pill className="w-full py-3">
            View Payment Details
          </LinkButton>
          <LinkButton href={`/courses/${id}?pay=submit`} variant="accent" pill className="w-full py-3">
            Submit Payment Again
          </LinkButton>
        </div>
      </aside>
    );
  }

  // ---- payment approved, or course finished
  const done = state === 'COMPLETED';
  return (
    <aside className={card}>
      <p className="-mx-6 -mt-6 mb-4 h-1.5 bg-green-500" />
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-700">
        <CheckIcon className="size-4" />
        {done ? 'Course completed' : 'Course unlocked'}
      </p>
      <p className="mt-3 text-sm text-black">
        {done ? 'You passed the assessment. You are eligible for a certificate.' : 'You can now access all course content.'}
      </p>
      <div className="mt-6 space-y-3">
        {done && (
          <LinkButton href="/certificates" pill className="w-full py-3">
            View Certificate
          </LinkButton>
        )}
        <LinkButton href={`/learn/${id}`} variant={done ? 'soft' : 'primary'} pill className="w-full py-3">
          {done ? 'Review Course' : hasStarted ? 'Continue Course' : 'Start Course'}
        </LinkButton>
      </div>
    </aside>
  );
}
