
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export const extOf = (name: string) =>
  name.split('.').pop()?.toLowerCase() ?? '';

export const mimeFor = (file: File) =>
  MIME_BY_EXT[extOf(file.name)] ?? file.type;

export const LESSON_TYPES = [
  {
    value: 'PDF',
    label: 'PDF',
    accept: '.pdf,application/pdf',
    hint: 'PDF up to 10 MB.',
  },
  {
    value: 'VIDEO',
    label: 'Video',
    accept: '.mp4,.webm,video/mp4,video/webm',
    hint: 'MP4 or WebM up to 10 MB.',
  },
  {
    value: 'SLIDES',
    label: 'Slides (.pptx)',
    accept: '.pptx',
    hint: 'PowerPoint up to 10 MB.',
  },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateLessonFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'Files cannot exceed 10 MB in demo mode.';
  }

  return null;
}

export function putFile(
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}). Please try again.`));

    xhr.onerror = () =>
      reject(new Error('Upload failed. Check your internet connection.'));

    xhr.send(file);
  });
}
