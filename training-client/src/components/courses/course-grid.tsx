import { CourseSummary, MyCourse } from '@/lib/course-types';
import CourseCard from './course-card';

/** 3 per row on desktop, 2 on tablet, 1 on phone. `states` maps a course id to the learner's state. */
export default function CourseGrid({
  courses,
  states = {},
}: {
  courses: CourseSummary[];
  states?: Record<string, MyCourse>;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} mine={states[c.id]} />
      ))}
    </div>
  );
}
