import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  NotFoundException,
  PayloadTooLargeException,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StorageService } from './storage.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Put('upload')
  async upload(
    @Query('key') key: string,
    @Headers('content-type') contentType: string,
    @Req() req: Request,
  ) {
    if (!key) throw new BadRequestException('Missing file key.');

    const declaredLength = Number(req.headers['content-length']);

    if (declaredLength > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Files cannot exceed 10 MB.');
    }

    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk);

      total += buffer.length;

      if (total > MAX_FILE_SIZE) {
        throw new PayloadTooLargeException(
          'Files cannot exceed 10 MB.',
        );
      }

      chunks.push(buffer);
    }

    await this.storage.saveUpload(
      key,
      contentType ?? '',
      Buffer.concat(chunks, total),
    );

    return { success: true };
  }

  @Get('download')
  async download(
    @Query('key') key: string,
    @Query('fileName') fileName: string,
    @Query('inline') inline: string,
    @Res() res: Response,
  ) {
    if (!key) throw new BadRequestException('Missing file key.');

    const file = await this.storage.getFile(key);

    if (!file) throw new NotFoundException('File not found.');

    const safeName = fileName || 'download';
    const disposition = inline === 'true' ? 'inline' : 'attachment';

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    );

    return res.send(file.data);
  }
}