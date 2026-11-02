import { redirect } from 'next/navigation';
import { LinkButton } from '@/components/button';
import EmptyState from '@/components/courses/empty-state';
import { Curriculum } from '@/lib/course-types';
import { tryApi } from '@/lib/viewer';

// /learn/<course>: go straight to the next unfinished lesson (or the first one)
export default async function LearnIndex({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const curriculum = await tryApi<Curriculum>(`/courses/${courseId}/curriculum`);
  const first = curriculum?.nextLessonId ?? curriculum?.sections.flatMap((s) => s.lessons)[0]?.id;
  if (first) redirect(`/learn/${courseId}/${first}`);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <EmptyState
        title="No lessons yet, check back later"
        text="This course does not have any lessons published yet."
        action={<LinkButton href={`/courses/${courseId}`} variant="soft" pill>Back to course</LinkButton>}
      />
    </div>
  );
}
