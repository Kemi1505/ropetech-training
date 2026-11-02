import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { LinkButton } from '@/components/button';
import { DocIcon } from '@/components/icons';
import CompleteButton from '@/components/learn/complete-button';
import LearnSidebar from '@/components/learn/learn-sidebar';
import { OpenLesson } from '@/lib/app-types';
import { Curriculum, isUuid } from '@/lib/course-types';
import { getSession } from '@/lib/session';
import { tryApi } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Lesson' };

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  if (!isUuid(courseId) || !isUuid(lessonId)) notFound();

  const [session, lesson, curriculum] = await Promise.all([
    getSession(),
    tryApi<OpenLesson>(`/courses/${courseId}/lessons/${lessonId}`), // also remembers this as the last opened lesson
    tryApi<Curriculum>(`/courses/${courseId}/curriculum`),
  ]);
  if (!curriculum) redirect(`/courses/${courseId}`);
  if (!lesson) notFound();

  const isLearner = session?.user.role === 'USER';
  const prev = lesson.previousLessonId ? `/learn/${courseId}/${lesson.previousLessonId}` : null;
  const next = lesson.nextLessonId ? `/learn/${courseId}/${lesson.nextLessonId}` : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-800">{lesson.title}</h1>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {lesson.type === 'PDF' ? 'PDF' : lesson.type === 'VIDEO' ? 'Video' : 'Slides'}
          </span>
        </div>

        {/* the file itself: shown in the page when the browser can, otherwise a download */}
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-md shadow-brand-900/10">
          {lesson.type === 'PDF' && 
          <iframe src={lesson.url} 
          title={lesson.title} className="h-[75vh] w-full" />}
          {lesson.type === 'VIDEO' && (
            <video controls controlsList="nodownload" playsInline preload="metadata" src={lesson.url} className="aspect-video w-full bg-black">
              Your browser cannot play this video.
            </video>
          )}
          {lesson.type === 'SLIDES' && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <DocIcon className="size-7" />
              </span>
              <p className="mt-4 font-semibold text-brand-800">{lesson.fileName}</p>
              <p className="mt-1 max-w-sm text-sm text-brand-500">Slides open in PowerPoint, so they are offered as a download.</p>
              <a href={lesson.url} download className="mt-6 inline-flex items-center rounded-full bg-brand-700 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-600">
                Download slides
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {prev ? (
            <LinkButton href={prev} variant="soft" pill>← Previous</LinkButton>
          ) : (
            <span />
          )}
          {isLearner && <CompleteButton courseId={courseId} lessonId={lessonId} completed={lesson.completed} nextHref={next} />}
          {next ? (
            <LinkButton href={next} variant="soft" pill>Next lesson →</LinkButton>
          ) : (
            <LinkButton href={`/learn/${courseId}/assessment`} variant="soft" pill>Assessment →</LinkButton>
          )}
        </div>
      </div>

      <LearnSidebar courseId={courseId} curriculum={curriculum} currentLessonId={lessonId} />
    </div>
  );
}
