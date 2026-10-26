import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { 
  CreateLessonDto, 
  MoveLessonDto, 
  ReorderDto, 
  SectionDto, 
  UpdateLessonDto, 
  UploadUrlDto 
} from './dto/lesson.dto';
import { LessonsService } from './lessons.service';
import { ApiAuth } from '../common/api-auth.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/enums';

@ApiTags('Sections and lessons (admin)')
@ApiAuth()
@Roles(Role.ADMIN) // admin or superadmin
@Controller('admin/courses/:courseId')
export class AdminLessonsController {
  constructor(private lessons: LessonsService) {}

  @ApiOperation({ summary: 'All sections with their lessons (for the content step)' })
  @Get('outline')
  outline(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.lessons.outline(courseId);
  }

  // ------------------------------------------------------------------ sections
  @ApiOperation({ summary: 'Add a section' })
  @Post('sections')
  createSection(@Param('courseId', ParseUUIDPipe) courseId: string, @Body() dto: SectionDto) {
    return this.lessons.createSection(courseId, dto);
  }

  @ApiOperation({ summary: 'Reorder sections: send all section ids in the new order' })
  @Put('sections/reorder')
  reorderSections(@Param('courseId', ParseUUIDPipe) courseId: string, @Body() dto: ReorderDto) {
    return this.lessons.reorderSections(courseId, dto.ids);
  }

  @ApiOperation({ summary: 'Rename a section' })
  @Patch('sections/:sectionId')
  renameSection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: SectionDto,
  ) {
    return this.lessons.renameSection(courseId, sectionId, dto);
  }

  @ApiOperation({ summary: 'Delete a section and its lessons' })
  @Delete('sections/:sectionId')
  deleteSection(@Param('courseId', ParseUUIDPipe) courseId: string, @Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.lessons.deleteSection(courseId, sectionId);
  }

  // ------------------------------------------------------------------- lessons
  @ApiOperation({ summary: 'Step 1 of adding a lesson: get a signed URL to upload the file to' })
  @HttpCode(200)
  @Post('lessons/upload-url')
  uploadUrl(@Param('courseId', ParseUUIDPipe) courseId: string, @Body() dto: UploadUrlDto) {
    return this.lessons.uploadUrl(courseId, dto);
  }

  @ApiOperation({ summary: 'Step 2: after uploading, create the lesson in a section' })
  @Post('sections/:sectionId/lessons')
  createLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessons.createLesson(courseId, sectionId, dto);
  }

  @ApiOperation({ summary: 'Reorder lessons inside a section: send all lesson ids in the new order' })
  @Put('sections/:sectionId/lessons/reorder')
  reorderLessons(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.lessons.reorderLessons(courseId, sectionId, dto.ids);
  }

  @ApiOperation({ summary: 'Rename a lesson' })
  @Patch('lessons/:lessonId')
  updateLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessons.updateLesson(courseId, lessonId, dto);
  }

  @ApiOperation({ summary: 'Move a lesson to another section (or position)' })
  @Patch('lessons/:lessonId/move')
  moveLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: MoveLessonDto,
  ) {
    return this.lessons.moveLesson(courseId, lessonId, dto);
  }

  @ApiOperation({ summary: 'Duplicate a lesson (the file is copied too)' })
  @HttpCode(200)
  @Post('lessons/:lessonId/duplicate')
  duplicate(@Param('courseId', ParseUUIDPipe) courseId: string, @Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.lessons.duplicateLesson(courseId, lessonId);
  }

  @ApiOperation({ summary: 'Delete a lesson and its file' })
  @Delete('lessons/:lessonId')
  deleteLesson(@Param('courseId', ParseUUIDPipe) courseId: string, @Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.lessons.deleteLesson(courseId, lessonId);
  }
}
