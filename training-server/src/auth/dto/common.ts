import { TransformFnParams } from 'class-transformer';

export const trimLower = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// 8-72 chars (bcrypt ignores everything after 72 bytes)
export const MIN_PASSWORD_MESSAGE =
  'Password should be at least 6 characters';

export const MAX_PASSWORD_MESSAGE =
  'Password should not be more than 72 characters';
