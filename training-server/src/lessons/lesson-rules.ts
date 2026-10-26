import { LessonType } from "../generated/enums";

const MB = 1024 * 1024;

export interface LessonRule {
  mimes: string[];
  exts: string[];
  maxBytes: number;
  /** true: the browser can show it inside the page. false: it is offered as a download. */
  inline: boolean;
  /** Does the start of the file look right? (checked on the uploaded object) */
  magic: (head: Buffer) => boolean;
}

const startsWith = (head: Buffer, bytes: number[]) => head.length >= bytes.length && bytes.every((b, i) => head[i] === b);

export const LESSON_RULES: Record<LessonType, LessonRule> = {
  PDF: {
    mimes: ['application/pdf'],
    exts: ['pdf'],
    //maxBytes: 50 * MB,
    maxBytes: 5 * MB,
    inline: true,
    magic: (h) => h.subarray(0, 5).toString('latin1') === '%PDF-',
  },
  SLIDES: {
    mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    exts: ['pptx'],
    //maxBytes: 100 * MB,
    maxBytes: 1 * MB,
    inline: false, // browsers cannot display .pptx, so learners download it
    magic: (h) => startsWith(h, [0x50, 0x4b, 0x03, 0x04]), // a .pptx is a zip file
  },
  VIDEO: {
    mimes: ['video/mp4', 'video/webm'],
    exts: ['mp4', 'webm'],
    //maxBytes: 1024 * MB,
    maxBytes: 10 * MB,
    inline: true,
    magic: (h) => h.subarray(4, 8).toString('latin1') === 'ftyp' || startsWith(h, [0x1a, 0x45, 0xdf, 0xa3]), // mp4 or webm
  },
};
