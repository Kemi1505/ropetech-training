import { Body, Controller, Get, Patch, Post, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiAuth } from '../common/api-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { FILE_RULES, FilesService } from '../files/files.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

type UploadedProfileFiles = { picture?: Express.Multer.File[]; certificationFile?: Express.Multer.File[] };

const uploads = () =>
  UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'picture', maxCount: 1 },
        { name: 'certificationFile', maxCount: 1 },
      ],
      { limits: { fileSize: FILE_RULES.certification.maxBytes } }, // per-file rules are enforced again in FilesService
    ),
  );

const first = (files?: UploadedProfileFiles) => ({
  picture: files?.picture?.[0],
  certificationFile: files?.certificationFile?.[0],
});

@ApiTags('Profile')
@ApiAuth()
@Controller('profile')
export class ProfileController {
  constructor(
    private profile: ProfileService,
    private files: FilesService,
  ) {}

  @ApiOperation({ summary: 'Complete your profile (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @uploads()
  @Post()
  complete(@CurrentUser() user: AuthUser, @Body() dto: CompleteProfileDto, @UploadedFiles() files: UploadedProfileFiles) {
    return this.profile.complete(user.id, user.role, dto, first(files));
  }

  @ApiOperation({ summary: 'View your profile (certification only appears once approved)' })
  @Get()
  view(@CurrentUser() user: AuthUser) {
    return this.profile.view(user.id);
  }

  @ApiOperation({ summary: 'Edit one or more profile fields (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @uploads()
  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto, @UploadedFiles() files: UploadedProfileFiles) {
    return this.profile.update(user.id, user.role, dto, first(files));
  }

  @ApiOperation({ summary: 'Your profile picture' })
  @Get('picture')
  async picture(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.files.stream(await this.profile.pictureFileId(user.id), res, { cache: 'private' });
  }

  @ApiOperation({ summary: 'Your uploaded certification file' })
  @Get('certification-file')
  async certification(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.files.stream(await this.profile.certificationFileId(user.id), res, { cache: 'private' });
  }
}
