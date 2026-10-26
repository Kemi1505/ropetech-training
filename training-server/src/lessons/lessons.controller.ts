import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { ApiAuth } from '../common/api-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';

@ApiTags('Lessons')
@ApiAuth()
@Controller('courses/:courseId')
export class LessonsController {
  constructor(private lessons: LessonsService) {}

  @ApiOperation({ summary: 'Sections and lessons of a course (locked until payment is approved), with your progress' })
  @Get('curriculum')
  curriculum(@Param('courseId', ParseUUIDPipe) courseId: string, @CurrentUser() user: AuthUser) {
    return this.lessons.curriculum(courseId, user);
  }

  @ApiOperation({ summary: 'Open a lesson: returns a temporary link to the file, plus previous and next lesson' })
  @Get('lessons/:lessonId')
  open(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lessons.openLesson(courseId, lessonId, user);
  }

  @ApiOperation({ summary: 'Mark a lesson as completed (learners). Powers the progress percentage.' })
  @HttpCode(200)
  @Post('lessons/:lessonId/complete')
  complete(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.lessons.complete(courseId, lessonId, user);
  }
}
