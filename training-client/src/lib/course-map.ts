import { MyCourseItem } from './app-types';
import { CourseSummary, MyCourse } from './course-types';

/** An enrolled course (from /me/...) as the card component expects it. */
export const asCard = (i: MyCourseItem): CourseSummary => ({
  id: i.courseId,
  name: i.name,
  shortDescription: i.shortDescription,
  price: i.price,
  difficulty: i.difficulty,
  requiresPreviousCertification: false,
  isFeatured: false,
  pictureUrl: i.pictureUrl,
  lessonCount: i.lessonCount,
  createdAt: i.enrolledAt,
});

export const asMine = (i: MyCourseItem): MyCourse => ({
  enrollmentId: i.enrollmentId,
  courseId: i.courseId,
  state: i.state,
  progress: i.progress,
});

export const statesOf = (items: MyCourseItem[]): Record<string, MyCourse> =>
  Object.fromEntries(items.map((i) => [i.courseId, asMine(i)]));
