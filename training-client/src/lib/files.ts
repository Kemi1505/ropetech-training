const MB = 1024 * 1024;

export interface FileRule {
  types: string[];
  maxBytes: number;
  label: string;
}

// Same limits as the backend (it re-checks the real file contents)
export const PICTURE_RULE: FileRule = { types: ['image/png', 'image/jpeg'], maxBytes: 3 * MB, label: 'a PNG or JPG image' };
export const CERTIFICATION_RULE: FileRule = {
  types: ['application/pdf', 'image/png', 'image/jpeg'],
  maxBytes: 5 * MB,
  label: 'a PDF, PNG or JPG',
};

export function validateFile(file: File | null, rule: FileRule): string | undefined {
  if (!file) return undefined;
  if (!rule.types.includes(file.type)) return `File must be ${rule.label}.`;
  if (file.size > rule.maxBytes) return `File must be ${Math.round(rule.maxBytes / MB)} MB or smaller.`;
  return undefined;
}

export const formatBytes = (n: number) =>
  n < MB ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / MB).toFixed(1)} MB`;
