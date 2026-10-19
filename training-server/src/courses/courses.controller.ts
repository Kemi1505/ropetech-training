import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiAuth } from '../common/api-auth.decorator';
import { FilesService } from '../files/files.service';
import { CoursesService } from './courses.service';
import { ListCoursesDto } from './dto/list-courses.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private courses: CoursesService,
    private files: FilesService,
  ) {}

  @ApiOperation({ summary: 'List published courses (public)' })
  @Public()
  @Get()
  list(@Query() q: ListCoursesDto) {
    return this.courses.listPublished(q);
  }

  @ApiOperation({ summary: 'View one published course (public)' })
  @Public()
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courses.getPublished(id);
  }

  @ApiOperation({ summary: 'Picture of a published course (public)' })
  @Public()
  @Get(':id/picture')
  async picture(
    @Param('id', ParseUUIDPipe) id: string, 
    @Res({ passthrough: true }) res: Response) {
    return this.files.stream(
      await this.courses.publishedPictureId(id), 
      res, 
      { cache: 'public' });
  }

  @ApiOperation({ summary: 'Enroll in a published course. Payment is approved separately.' })
  @ApiAuth()
  @Post(':id/enroll')
  enroll(
    @CurrentUser() user: AuthUser, 
    @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.enroll(user, id);
  }

  @ApiOperation({ summary: 'Your enrollment and payment status for this course' })
  @ApiAuth()
  @Get(':id/my-enrollment')
  myEnrollment(
    @CurrentUser() user: AuthUser, 
    @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.myEnrollment(user.id, id);
  }
}
