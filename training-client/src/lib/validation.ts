// Mirrors the backend rules so users get instant feedback (the server still enforces them).

export function validateEmail(value: string): string | undefined {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : 'Enter a valid email address.';
}

export function validateNewPassword(value: string): string | undefined {
  if (value.length < 6) return 'Password must be at least 6 characters.';
  if (value.length > 72) return 'Password must be 72 characters or fewer.';
  return undefined;
}
