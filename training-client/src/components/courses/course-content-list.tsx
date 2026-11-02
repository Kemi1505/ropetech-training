import Link from 'next/link';
import { ChevronIcon, CheckIcon, DocIcon, LockIcon, PlayIcon, SlidesIcon } from '@/components/icons';
import { CourseDetail, Curriculum, LessonType, lessonsLabel } from '@/lib/course-types';

const TYPE: Record<LessonType, { label: string; icon: React.ReactNode }> = {
  PDF: { label: 'PDF', icon: <DocIcon className="size-4" /> },
  VIDEO: { label: 'Video', icon: <PlayIcon className="size-4" /> },
  SLIDES: { label: 'Slides', icon: <SlidesIcon className="size-4" /> },
};

/**
 * Sections and lessons. Everyone sees the titles; lessons stay locked (padlock) until payment is approved.
 * Uses <details>, so it opens and closes without any JavaScript.
 */
export default function CourseContentList({
  courseId,
  sections,
  curriculum,
}: {
  courseId: string;
  sections: CourseDetail['sections'];
  curriculum: Curriculum | null;
}) {
  const unlocked = !!curriculum && !curriculum.locked;
  const done = new Set(
    curriculum?.sections.flatMap((s) => s.lessons.filter((l) => l.completed).map((l) => l.id)) ?? [],
  );

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <details key={section.id} open={index === 0} className="group overflow-hidden rounded-lg bg-surface-alt">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="text-brand-700 transition-transform group-open:rotate-90">
              <ChevronIcon dir="right" className="size-5" />
            </span>
            <span className="flex-1 font-semibold text-brand-800">
              {String(index + 1).padStart(2, '0')}. {section.title}
            </span>
            <span className="text-sm text-brand-500">{lessonsLabel(section.lessons.length)}</span>
          </summary>

          <ul className="space-y-1 px-3 pb-3">
            {section.lessons.map((lesson) => {
              const type = TYPE[lesson.type];
              const row = (
                <>
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    {!unlocked ? (
                      <LockIcon className="size-4 text-brand-300" />
                    ) : done.has(lesson.id) ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-green-50 text-green-700">
                        <CheckIcon className="size-3.5" />
                      </span>
                    ) : (
                      <span className="size-4 rounded-full border-2 border-brand-300" />
                    )}
                  </span>
                  <span className="flex-1 text-sm text-black">{lesson.title}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-700">
                    {type.icon}
                    {type.label}
                  </span>
                </>
              );
              return (
                <li key={lesson.id}>
                  {unlocked ? (
                    <Link
                      href={`/learn/${courseId}/${lesson.id}`}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-white"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </div>
  );
}
