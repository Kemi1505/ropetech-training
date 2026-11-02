import Link from 'next/link';
import { CheckIcon } from '@/components/icons';
import { CourseSetup } from '@/lib/app-types';

export const STEPS = [
  { key: 'basic', label: 'Basic info' },
  { key: 'content', label: 'Content' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'review', label: 'Review & publish' },
] as const;
export type StepKey = (typeof STEPS)[number]['key'];

/** Six steps. Done steps get a tick; every step is a link, so an admin can jump around and come back later. */
export default function Stepper({ courseId, current, setup }: { courseId?: string; current: StepKey; setup?: CourseSetup }) {
  return (
    <ol className="grid grid-cols-3 gap-y-5 sm:grid-cols-6">
      {STEPS.map((s, i) => {
        const done = setup ? setup.steps[s.key].done : s.key === 'basic' && false;
        const active = s.key === current;
        const circle = (
          <span
            className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${
              active ? 'bg-brand-700 text-white' : done ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-500'
            }`}
          >
            {done && !active ? <CheckIcon className="size-4" /> : i + 1}
          </span>
        );
        const body = (
          <span className="flex flex-col items-center gap-2 text-center">
            {circle}
            <span className={`text-xs ${active ? 'font-semibold text-brand-800' : 'text-brand-500'}`}>{s.label}</span>
          </span>
        );
        return (
          <li key={s.key} aria-current={active ? 'step' : undefined}>
            {courseId ? (
              <Link href={`/admin/courses/${courseId}?step=${s.key}`} className="block hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ol>
  );
}
