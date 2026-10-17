import { TransformFnParams } from 'class-transformer';

export const trim = ({ value }: TransformFnParams) => (typeof value === 'string' ? value.trim() : value);

/** multipart/form-data sends everything as text: 'true' -> true */
export const toBoolean = ({ value }: TransformFnParams) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return value; // anything else fails @IsBoolean
};

const clean = (items: unknown[]) =>
  items.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '');

/** Accepts repeated form fields, a JSON array string, or a single string */
export const toStringArray = ({ value }: TransformFnParams) => {
  if (Array.isArray(value)) return clean(value);
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) return clean(parsed);
      } catch {
        /* fall through: treat as one string */
      }
    }
    return text ? [text] : [];
  }
  return value;
};
