import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB

@Injectable()
export class StorageService {
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('APP_BASE_URL');
  }

  async uploadUrl(
    key: string,
    contentType: string,
    size: number,
    _expiresInSeconds = 900,
  ) {
    if (size > MAX_FILE_SIZE) {
      throw new Error('Files cannot exceed 10 MB in demo mode.');
    }

    await this.prisma.anotherStoredFile.create({
      data: {
        key,
        data: Buffer.alloc(0),
        contentType,
        expectedSize: size,
      },
    });

    return `${this.baseUrl}/storage/upload?key=${encodeURIComponent(key)}`;
  }

  downloadUrl(
    key: string,
    opts: { fileName: string; contentType: string; inline: boolean },
    _expiresInSeconds = 3600,
  ) {
    const params = new URLSearchParams({
      key,
      fileName: opts.fileName,
      contentType: opts.contentType,
      inline: String(opts.inline),
    });

    return `${this.baseUrl}/storage/download?${params.toString()}`;
  }

  async saveUpload(key: string, contentType: string, data: Buffer) {
    const file = await this.prisma.anotherStoredFile.findUnique({
      where: { key },
    });

    if (!file || file.uploaded) {
      throw new Error('Upload is invalid, expired, or already completed.');
    }

    if (data.length > MAX_FILE_SIZE) {
      throw new Error('Files cannot exceed 10 MB in demo mode.');
    }

    if (data.length !== file.expectedSize) {
      throw new Error('Uploaded file size does not match the declared size.');
    }

    if (contentType !== file.contentType) {
      throw new Error('Content-Type does not match the declared file type.');
    }

    await this.prisma.anotherStoredFile.update({
      where: { key },
      data: {
        data: new Uint8Array(data),
        size: data.length,
        uploaded: true,
      },
    });
  }

  async getFile(key: string) {
    const file = await this.prisma.anotherStoredFile.findUnique({
      where: { key },
    });

    if (!file || !file.uploaded) {
      return null;
    }

    return {
      data: Buffer.from(file.data),
      size: file.size,
      contentType: file.contentType,
    };
  }

  async head(
    key: string,
  ): Promise<{ size: number; contentType: string } | null> {
    const file = await this.prisma.anotherStoredFile.findUnique({
      where: { key },
    });

    if (!file || !file.uploaded) return null;

    return {
      size: file.size,
      contentType: file.contentType,
    };
  }

  async peek(key: string, bytes = 16): Promise<Buffer> {
    const file = await this.getFile(key);

    if (!file) throw new Error('File not found.');

    return file.data.subarray(0, bytes);
  }

  async copy(fromKey: string, toKey: string) {
    const file = await this.getFile(fromKey);

    if (!file) throw new Error('Source file not found.');

    await this.prisma.anotherStoredFile.create({
      data: {
        key: toKey,
        data: file.data,
        contentType: file.contentType,
        size: file.size,
        expectedSize: file.size,
        uploaded: true,
      },
    });
  }

  async deleteMany(keys: Array<string | null | undefined>) {
    const realKeys = keys.filter((key): key is string => !!key);

    if (!realKeys.length) return;

    await this.prisma.anotherStoredFile.deleteMany({
      where: { key: { in: realKeys } },
    });
  }
}
