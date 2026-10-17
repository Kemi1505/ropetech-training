import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export type FileKind = 'png' | 'jpg' | 'pdf' | 'pptx';

export const MIME: Record<FileKind, string> = {
  png: 'image/png',
  jpg: 'image/jpg',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export const kindOfMime = (mime: string): FileKind | null =>
  (Object.keys(MIME) as FileKind[]).find((k) => MIME[k] === mime) ?? null;

export interface FileRule {
  kinds: FileKind[];
  maxBytes: number;
  label: string;
}

const MB = 1024 * 1024;
export const FILE_RULES: Record<'image' | 'certification' | 'content', FileRule> = {
  image: { kinds: ['png', 'jpg'], maxBytes: 3 * MB, label: 'PNG' },
  certification: { kinds: ['pdf', 'png', 'jpg'], maxBytes: 5 * MB, label: 'PDF or PNG' },
  content: { kinds: ['pdf', 'pptx', 'png'], maxBytes: 25 * MB, label: 'PDF, PPTX or PNG' },
};

/**
 * The only place that knows files live in Postgres. If you move to S3/Cloudinary later,
 * change this service and nothing else.
 */
@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  /** Checks the real file contents (magic bytes), not the client-supplied type or extension. */
  private detectKind(buf: Buffer): FileKind | null {
    if (
      buf.length > 8 && buf.subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'png';
    }
    if (
      buf.length >= 3 &&
      buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ) {
      return 'jpg';
    }
    if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
    // .pptx is a zip; docx/xlsx are zips too, so also require the PowerPoint part name
    if (buf.subarray(0, 4)
      .equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) 
      && buf.includes('ppt/presentation.xml')) {
      return 'pptx';
    }
    return null;
  }

  private safeName(original: string, kind: FileKind) {
    const base = (original || '')
      .split(/[\\/]/)
      .pop()!
      .replace(/[\u0000-\u001f\u007f"]/g, '')
      .trim()
      .slice(0, 150);
    return base || `file.${kind}`;
  }

  async save(file: Express.Multer.File | undefined, rule: FileRule) {
    if (!file?.buffer?.length) throw new BadRequestException('A file is required');
    if (file.size > rule.maxBytes) {
      throw new PayloadTooLargeException(`File too large. Maximum is ${Math.round(rule.maxBytes / MB)} MB.`);
    }
    const kind = this.detectKind(file.buffer);
    if (!kind || !rule.kinds.includes(kind)) {
      throw new BadRequestException(`Only ${rule.label} files are allowed`);
    }
    return this.prisma.storedFile.create({
      data: {
        filename: this.safeName(file.originalname, kind),
        mimeType: MIME[kind],
        size: file.size,
        data: new Uint8Array(file.buffer),
      },
      select: { id: true, filename: true },
    });
  }

  async deleteMany(ids: Array<string | null | undefined>) {
    const real = ids.filter((id): id is string => !!id);
    if (real.length) await this.prisma.storedFile.deleteMany({ where: { id: { in: real } } });
  }

  /** Sets headers on `res` and returns the body. Use with @Res({ passthrough: true }). */
  async stream(id: string, res: Response, opts: { cache: 'public' | 'private' }) {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');

    const inline = file.mimeType !== MIME.pptx; // browsers can show png/pdf; pptx is downloaded
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.size),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Cache-Control': opts.cache === 'public' ? 'public, max-age=3600' : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(Buffer.from(file.data.buffer, file.data.byteOffset, file.data.byteLength));
  }
}
