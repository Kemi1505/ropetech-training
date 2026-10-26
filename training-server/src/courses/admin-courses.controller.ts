import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/types';
import { ApiAuth } from '../common/api-auth.decorator';
import { FILE_RULES, FilesService } from '../files/files.service';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { FeaturedDto } from './dto/featured.dto';
import { AdminListCoursesDto } from './dto/list-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Role } from '../generated/enums';

const pictureUpload = () =>
  UseInterceptors(FileInterceptor('picture', { limits: { fileSize: FILE_RULES.image.maxBytes } }));

@ApiTags('Courses (admin)')
@ApiAuth()
@Roles(Role.ADMIN) // admin or superadmin; delete overrides this below
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(
    private courses: CoursesService,
    private files: FilesService,
  ) {}

  @ApiOperation({ summary: 'Step 1: create a course as a draft (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @pictureUpload()
  @Post()
  create(@CurrentUser() me: AuthUser, @Body() dto: CreateCourseDto, @UploadedFile() picture?: Express.Multer.File) {
    return this.courses.create(dto, picture, me.id);
  }

  @ApiOperation({ summary: 'All courses. Filter with ?status=DRAFT|PUBLISHED|UNPUBLISHED and ?search=' })
  @Get()
  list(@Query() q: AdminListCoursesDto) {
    return this.courses.listAll(q);
  }

  @ApiOperation({ summary: 'Numbers for the status tabs: all, published, unpublished, draft' })
  @Get('counts')
  counts() {
    return this.courses.statusCounts();
  }

  @ApiOperation({ summary: 'Setup progress for the six steps, so the wizard can resume' })
  @Get(':id/setup')
  setup(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.setup(id);
  }

  @ApiOperation({ summary: 'Preview: the course page exactly as a learner would see it (works for drafts)' })
  @Get(':id/preview')
  preview(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.preview(id);
  }

  @ApiOperation({ summary: 'One course with status and counts' })
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.getAny(id);
  }

  @ApiOperation({ summary: 'Course picture (any course)' })
  @Get(':id/picture')
  async picture(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    return this.files.stream(await this.courses.anyPictureId(id), res, { cache: 'private' });
  }

  @ApiOperation({ summary: 'Edit a course (multipart/form-data, send only what changes)' })
  @ApiConsumes('multipart/form-data')
  @pictureUpload()
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto, @UploadedFile() picture?: Express.Multer.File) {
    return this.courses.update(id, dto, picture);
  }

  @ApiOperation({ summary: 'Publish (needs lessons, outcomes, a question and a pass mark)' })
  @Patch(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.setPublished(id, true);
  }

  @ApiOperation({ summary: 'Unpublish (hides it from the catalogue; enrolled learners keep access)' })
  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.setPublished(id, false);
  }

  @ApiOperation({ summary: 'Feature or un-feature a course (the Featured switch in Settings)' })
  @Patch(':id/featured')
  featured(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FeaturedDto) {
    return this.courses.setFeatured(id, dto.isFeatured);
  }

  @ApiOperation({ summary: 'Delete a course (superadmin only, blocked if it has enrollments)' })
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.remove(id);
  }
}
