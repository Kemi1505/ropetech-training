import Link from 'next/link';
import { LinkButton } from '@/components/button';
import { DocIcon } from '@/components/icons';
import { formatPrice } from '@/lib/format';
import { CourseSummary, MyCourse, resourcesLabel } from '@/lib/course-types';
import CoursePicture from './course-picture';
import StatusChip from './status-chip';

/**
 * One course widget. Without `mine` it is the "not enrolled" widget (price + Enroll).
 * With `mine` (the learner is enrolled) the bottom row shows their state instead.
 */
export default function CourseCard({ course, mine }: { course: CourseSummary; mine?: MyCourse | null }) {
  const page = `/courses/${course.id}`;
  const learn = `/learn/${course.id}`;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg bg-white shadow-md shadow-brand-900/10 transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-brand-50">
        <CoursePicture pictureUrl={course.pictureUrl} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold text-brand-700">
          {/* the whole card is clickable through this link; the action button sits above it */}
          <Link href={page} className="after:absolute after:inset-0">
            {course.name}
          </Link>
        </h3>

        {!mine && (
          <>
            <p className="mt-1 line-clamp-2 text-sm text-black">{course.shortDescription}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-brand-500">
              <DocIcon className="size-4" />
              {resourcesLabel(course.lessonCount)}
            </p>
          </>
        )}

        <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-5">
          {!mine && (
            <>
              <span className="text-lg font-bold text-brand-800">{formatPrice(course.price)}</span>
              <LinkButton href={page} pill>
                Enroll
              </LinkButton>
            </>
          )}

          {mine?.state === 'NOT_PAID' && (
            <>
              <span className="text-sm font-semibold text-accent-600">You have not paid for this course</span>
              <LinkButton href={`${page}?pay=details`} variant="accent" pill className="shrink-0">
                Make payment
              </LinkButton>
            </>
          )}

          {mine?.state === 'PAYMENT_PENDING' && (
            <>
              <StatusChip kind="pending">Payment pending</StatusChip>
              <LinkButton href={`${page}?pay=status`} variant="soft" pill>
                View
              </LinkButton>
            </>
          )}

          {mine?.state === 'PAYMENT_REJECTED' && (
            <>
              <StatusChip kind="rejected">Payment rejected</StatusChip>
              <LinkButton href={`${page}?pay=submit`} variant="accent" pill>
                Submit again
              </LinkButton>
            </>
          )}

          {mine?.state === 'READY_TO_START' && (
            <>
              <StatusChip kind="ready">Ready to start</StatusChip>
              <LinkButton href={learn} pill>
                Start
              </LinkButton>
            </>
          )}

          {mine?.state === 'IN_PROGRESS' && (
            <div className="flex w-full items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-brand-500">{mine.progress}% complete</p>
                <div
                  role="progressbar"
                  aria-label={`${course.name} progress`}
                  aria-valuenow={mine.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-1.5 h-2 rounded-full bg-brand-100"
                >
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${mine.progress}%` }} />
                </div>
              </div>
              <LinkButton href={learn} pill>
                Continue
              </LinkButton>
            </div>
          )}

          {mine?.state === 'COMPLETED' && (
            <>
              <StatusChip kind="done">Completed</StatusChip>
              <LinkButton href={page} variant="soft" pill>
                View
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

