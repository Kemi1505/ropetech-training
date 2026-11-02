import Link from 'next/link';
import { CheckIcon, DocIcon, PlayIcon, SlidesIcon } from '@/components/icons';
import { Curriculum, LessonType } from '@/lib/course-types';

const ICON: Record<LessonType, React.ReactNode> = {
  PDF: <DocIcon className="size-4" />,
  VIDEO: <PlayIcon className="size-4" />,
  SLIDES: <SlidesIcon className="size-4" />,
};

export default function LearnSidebar({
  courseId,
  curriculum,
  currentLessonId,
  onAssessment,
}: {
  courseId: string;
  curriculum: Curriculum;
  currentLessonId?: string;
  onAssessment?: boolean;
}) {
  const allDone = curriculum.progress.total > 0 && curriculum.progress.done === curriculum.progress.total;
  return (
    <aside className="rounded-lg bg-white p-4 shadow-md shadow-brand-900/10 lg:sticky lg:top-20 lg:self-start">
      <h2 className="px-2 pb-2 text-sm font-semibold text-brand-800">Course content</h2>
      <nav aria-label="Lessons" className="max-h-[60vh] space-y-4 overflow-y-auto">
        {curriculum.sections.map((s, i) => (
          <div key={s.id}>
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-brand-500">
              {String(i + 1).padStart(2, '0')}. {s.title}
            </p>
            <ul className="mt-1 space-y-0.5">
              {s.lessons.map((l) => {
                const current = l.id === currentLessonId;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${courseId}/${l.id}`}
                      aria-current={current ? 'page' : undefined}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm ${current ? 'bg-brand-100 font-semibold text-brand-800' : 'text-black hover:bg-brand-50'}`}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        {l.completed ? (
                          <span className="flex size-5 items-center justify-center rounded-full bg-green-50 text-green-700">
                            <CheckIcon className="size-3.5" />
                          </span>
                        ) : (
                          <span className="size-4 rounded-full border-2 border-brand-300" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      <span className="text-brand-400">{ICON[l.type]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-brand-100 pt-4">
        {allDone || onAssessment ? (
          <Link
            href={`/learn/${courseId}/assessment`}
            className={`flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold ${onAssessment ? 'bg-brand-100 text-brand-800' : 'bg-brand-700 text-white hover:bg-brand-600'}`}
          >
            Take assessment
          </Link>
        ) : (
          <>
            <span className="flex w-full cursor-not-allowed items-center justify-center rounded-full bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-400" aria-disabled="true">
              Take assessment
            </span>
            <p className="mt-2 text-center text-xs text-brand-500">
              Finish all lessons to unlock ({curriculum.progress.done} of {curriculum.progress.total} done)
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
