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
import { ApiAuth } from '../common/api-auth.decorator';
import { FILE_RULES, FilesService } from '../files/files.service';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesDto } from './dto/list-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';

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

  @ApiOperation({ summary: 'Add a course (multipart/form-data). Created as a draft.' })
  @ApiConsumes('multipart/form-data')
  @pictureUpload()
  @Post()
  create(
    @CurrentUser() me: AuthUser,
    @Body() dto: CreateCourseDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.courses.create(dto, picture, me.id);
  }

  @ApiOperation({ summary: 'View all courses, published or not (includes isPublished)' })
  @Get()
  list(@Query() q: ListCoursesDto) {
    return this.courses.listAll(q);
  }

  @ApiOperation({ summary: 'View one course, published or not' })
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.courses.update(id, dto, picture);
  }

  @ApiOperation({ summary: 'Publish (needs at least one content file)' })
  @Patch(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.setPublished(id, true);
  }

  @ApiOperation({ summary: 'Unpublish' })
  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.setPublished(id, false);
  }

  @ApiOperation({ summary: 'Delete a course (superadmin only, blocked if it has enrollments)' })
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.remove(id);
  }
}
