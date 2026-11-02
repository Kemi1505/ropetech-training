// Shapes returned by the backend for courses. See backend explanation/04-courses.md.

export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type LessonType = 'PDF' | 'VIDEO' | 'SLIDES';
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'APPROVED' | 'REJECTED';

/** A course as shown on a card */
export interface CourseSummary {
  id: string;
  name: string;
  shortDescription: string;
  price: number;
  difficulty: Difficulty;
  requiresPreviousCertification: boolean;
  isFeatured: boolean;
  pictureUrl: string | null; // API path, e.g. /courses/<id>/picture. null = use the default image
  lessonCount: number; // shown as "resources"
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Where a learner is with a course they enrolled in (from GET /me/courses) */
export type CourseState =
  | 'NOT_PAID'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_REJECTED'
  | 'READY_TO_START'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface MyCourse {
  enrollmentId: string;
  courseId: string;
  state: CourseState;
  progress: number; // percent of lessons completed
}

export interface CourseDetail extends CourseSummary {
  description: string;
  learningOutcomes: string[];
  certificationRequirement: string | null;
  assessment: { questionCount: number; passMark: number | null; maxAttempts: number };
  sections: { id: string; title: string; lessons: { id: string; title: string; type: LessonType }[] }[];
}

export interface MyEnrollment {
  enrolled: boolean;
  paymentStatus?: PaymentStatus;
  unlocked?: boolean;
  assessmentPassed?: boolean;
}

export interface Curriculum {
  courseId: string;
  locked: boolean;
  progress: { done: number; total: number; percent: number };
  nextLessonId: string | null;
  sections: { id: string; title: string; lessons: { id: string; title: string; type: LessonType; completed: boolean }[] }[];
}

export const resourcesLabel = (n: number) => `${n} ${n === 1 ? 'resource' : 'resources'}`;
export const lessonsLabel = (n: number) => `${n} ${n === 1 ? 'lesson' : 'lessons'}`;
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
