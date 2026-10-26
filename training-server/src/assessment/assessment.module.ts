import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { AdminAssessmentController } from './admin-assessment.controller';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  imports: [CoursesModule], // for the shared "is this course ready to publish" check
  controllers: [AssessmentController, AdminAssessmentController],
  providers: [AssessmentService],
})
export class AssessmentModule {}
