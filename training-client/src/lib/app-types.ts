import { CourseState, Difficulty, LessonType, PaymentStatus } from './course-types';

export interface PaymentSubmission {
  id: string;
  payerName: string;
  amountSent: number;
  status: PaymentStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/** GET /courses/:id/payment */
export interface PaymentInfo {
  enrollmentId: string;
  paymentStatus: PaymentStatus;
  course: { id: string; name: string };
  amountDue: number;
  bank: { bankName: string; accountNumber: string; accountName: string };
  steps: string[];
  submission: PaymentSubmission | null;
}

/** An enrolled course as listed by /me/courses and /me/enrollments */
export interface MyCourseItem {
  enrollmentId: string;
  courseId: string;
  name: string;
  shortDescription: string;
  difficulty: Difficulty;
  price: number;
  pictureUrl: string | null;
  lessonCount: number;
  paymentStatus: PaymentStatus;
  state: CourseState;
  progress: number;
  amountDue: number;
  lastOpenedAt: string | null;
  enrolledAt: string;
}

export interface OpenLesson {
  id: string;
  title: string;
  type: LessonType;
  fileName: string;
  inline: boolean;
  url: string;
  completed: boolean;
  previousLessonId: string | null;
  nextLessonId: string | null;
}

export interface ProfileView {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
  hasPreviousCertification: boolean;
  pictureUrl: string | null;
  certification?: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; approvedAt: string | null; rejectionReason: string | null; fileUrl: string };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface LearnerDashboard {
  type: 'user';
  firstName: string | null;
  hasEnrollments: boolean;
  continueLearning:
    | { kind: 'CONTINUE'; course: MyCourseItem; nextLessonId: string | null }
    | { kind: 'PAYMENT'; course: MyCourseItem }
    | null;
  myCourses: MyCourseItem[];
  featured: import('./course-types').CourseSummary[];
  explore: import('./course-types').CourseSummary[];
}

export interface AdminDashboard {
  type: 'admin';
  adminName: string;
  publishedCourses: number;
  unpublishedCourses: number;
  draftCourses: number;
  totalUsers: number;
  approvedPayments: number;
  pendingPayments: number;
  pendingCertifications: number;
  pendingActions: { payments: number; certifications: number; drafts: number };
  recentEnrollments: { id: string; user: string; course: string; enrolledAt: string; status: string }[];
}

export interface AssessmentView {
  courseId: string;
  passMark: number;
  totalQuestions: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  passed: boolean;
  canAttempt: boolean;
  blockedReason: 'PASSED' | 'CONTENT_INCOMPLETE' | 'NO_ATTEMPTS_LEFT' | null;
  contentProgress: { done: number; total: number };
  questions: { id: string; text: string; position: number; options: { id: string; text: string }[] }[];
}

export interface AssessmentResult {
  attempted?: boolean;
  score?: number;
  correct?: number;
  total?: number;
  passMark?: number;
  passed: boolean;
  message?: string;
  eligibleForCertificate: boolean;
  attemptsRemaining?: number;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminCourseRow {
  id: string;
  name: string;
  difficulty: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  isFeatured: boolean;
  enrollmentCount: number;
  lessonCount: number;
  updatedAt: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  createdAt: string;
  certificationStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  enrollments: number;
}

export interface AdminUserDetail extends Omit<AdminUserRow, 'enrollments'> {
  enrollments: { id: string; course: { id: string; name: string }; paymentStatus: string; enrolledAt: string }[];
}

export interface AdminEnrollmentRow {
  id: string;
  paymentStatus: 'UNPAID' | 'PENDING' | 'APPROVED' | 'REJECTED';
  enrolledAt: string;
  progress: number;
  user: { id: string; email: string; name: string | null };
  course: { id: string; name: string; price: number };
}

export interface AdminPaymentRow {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payerName: string;
  amountSent: number;
  expectedAmount: number;
  amountMatches: boolean;
  rejectionReason: string | null;
  submittedAt: string;
  course: { id: string; name: string };
  user: { id: string; email: string; name: string | null };
}

export interface AdminCertificationRow {
  userId: string;
  name: string;
  email: string;
  company: string | null;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  fileUrl: string;
}

export interface EditorCourse {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  learningOutcomes: string[];
  requiresPreviousCertification: boolean;
  certificationRequirement: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  pictureUrl: string | null;
  assessment: { questionCount: number; passMark: number | null; maxAttempts: number };
}

export interface CourseSetup {
  courseId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  canPublish: boolean;
  issues: string[];
  steps: {
    basic: { done: boolean };
    content: { done: boolean; sections: number; lessons: number };
    outcomes: { done: boolean; count: number };
    requirements: { done: boolean; requiresPreviousCertification: boolean };
    assessment: { done: boolean; count: number; passMark: number | null; maxAttempts: number };
    review: { done: boolean };
  };
  nextStep: 'content' | 'outcomes' | 'requirements' | 'assessment' | 'review' | null;
}

export interface Outline {
  courseId: string;
  sections: {
    id: string;
    title: string;
    position: number;
    lessons: { id: string; title: string; type: 'PDF' | 'VIDEO' | 'SLIDES'; position: number; fileName: string; fileSize: number }[];
  }[];
}

export interface AssessmentAdmin {
  courseId: string;
  isPublished: boolean;
  passMark: number | null;
  maxAttempts: number;
  questionCount: number;
  questions: { id: string; text: string; position: number; options: { id: string; text: string; isCorrect: boolean }[] }[];
}
