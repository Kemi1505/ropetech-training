import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { ApiAuth } from '../common/api-auth.decorator';
import { AssessmentService } from './assessment.service';
import { SubmitAssessmentDto } from './dto/assessment.dto';

@ApiTags('Assessment')
@ApiAuth()
@Controller('courses/:courseId/assessment')
export class AssessmentController {
  constructor(private assessment: AssessmentService) {}

  @ApiOperation({ summary: 'View the assessment questions (learners with approved payment)' })
  @Get()
  view(@CurrentUser() user: AuthUser, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.assessment.view(user, courseId);
  }

  @ApiOperation({ summary: 'Submit answers. Returns the score and whether you passed.' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('submit')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: SubmitAssessmentDto,
  ) {
    return this.assessment.submit(user, courseId, dto);
  }

  @ApiOperation({ summary: 'Your score. If you passed: eligible for a certificate, course completed.' })
  @Get('result')
  result(@CurrentUser() user: AuthUser, @Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.assessment.myResult(user, courseId);
  }
}
