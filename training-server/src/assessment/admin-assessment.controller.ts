import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentService } from './assessment.service';
import { CreateQuestionDto, FinishAssessmentDto, UpdateQuestionDto } from './dto/assessment.dto';
import { ApiAuth } from '../common/api-auth.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/enums';

@ApiTags('Assessment (admin)')
@ApiAuth()
@Roles(Role.ADMIN) // admin or superadmin
@Controller('admin/courses/:courseId/assessment')
export class AdminAssessmentController {
  constructor(private assessment: AssessmentService) {}

  @ApiOperation({ summary: 'All questions with correct answers, plus the pass mark (for the editor)' })
  @Get()
  get(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.assessment.getForAdmin(courseId);
  }

  @ApiOperation({ summary: 'Add a question: text + exactly 4 options, one correct' })
  @Post('questions')
  add(@Param('courseId', ParseUUIDPipe) courseId: string, @Body() dto: CreateQuestionDto) {
    return this.assessment.addQuestion(courseId, dto);
  }

  @ApiOperation({ summary: 'Edit a question and/or its answers (always allowed, even when published)' })
  @Patch('questions/:questionId')
  update(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.assessment.updateQuestion(courseId, questionId, dto);
  }

  @ApiOperation({ summary: 'Remove a question' })
  @Delete('questions/:questionId')
  remove(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.assessment.removeQuestion(courseId, questionId);
  }

  @ApiOperation({ summary: 'Give a learner their 5 attempts back (failed attempts stay in the history)' })
  @HttpCode(200)
  @Post('learners/:userId/reset-attempts')
  resetAttempts(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.assessment.resetAttempts(courseId, userId);
  }

  @ApiOperation({ summary: 'Finish: set the pass mark and publish in one request (publish:false just saves the pass mark)' })
  @HttpCode(200)
  @Post('finish')
  finish(@Param('courseId', ParseUUIDPipe) courseId: string, @Body() dto: FinishAssessmentDto) {
    return this.assessment.finish(courseId, dto);
  }
}
