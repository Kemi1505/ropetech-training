import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiAuth } from '../common/api-auth.decorator';
import { FILE_RULES, FilesService } from '../files/files.service';
import { ContentsService } from './contents.service';
import { AddContentDto } from './dto/add-content.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/enums';

@ApiTags('Course content')
@ApiAuth()
@Controller('courses/:courseId/contents')
export class ContentsController {
  constructor(
    private contents: ContentsService,
    private files: FilesService,
  ) {}

  @ApiOperation({ summary: 'View all content of a course (learners see it locked until payment is approved)' })
  @Get()
  list(@Param('courseId', ParseUUIDPipe) courseId: string, @CurrentUser() user: AuthUser) {
    return this.contents.list(courseId, user);
  }

  @ApiOperation({ summary: 'Add a file to a course: pdf, pptx or png (admin/superadmin)' })
  @ApiConsumes('multipart/form-data')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: FILE_RULES.content.maxBytes } }))
  @Post()
  add(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: AddContentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.contents.add(courseId, dto, file);
  }

  @ApiOperation({ summary: 'View/download one file (staff, or learners with approved payment)' })
  @Get(':contentId/file')
  async file(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.files.stream(await this.contents.fileIdFor(courseId, contentId, user), res, { cache: 'private' });
  }

  @ApiOperation({ summary: 'Remove a file from a course (admin/superadmin)' })
  @Roles(Role.ADMIN)
  @Delete(':contentId')
  remove(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.contents.remove(courseId, contentId);
  }

  @ApiOperation({ summary: 'Mark a file as completed. Powers the progress percentage.' })
  @HttpCode(200)
  @Post(':contentId/complete')
  complete(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contents.complete(courseId, contentId, user);
  }
}
