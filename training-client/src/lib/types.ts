export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  authType: 'LOCAL' | 'GOOGLE';
  isActive: boolean;
  createdAt: string;
}
