export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface User {
  id: string;
  email: string;
  role: Role;
  authType: 'EMAIL_AND_PASSWORD' | 'GOOGLE';
  isActive: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
  pictureUrl: string | null;
  /** Only present once an admin approved the certification */
  certification?: { approved: true; approvedAt: string | null; fileUrl: string };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
