import { Module } from '@nestjs/common';
import { AdminCoursesController } from './admin-courses.controller';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  controllers: [CoursesController, AdminCoursesController],
  providers: [CoursesService],
  exports: [CoursesService]
})
export class CoursesModule {}
