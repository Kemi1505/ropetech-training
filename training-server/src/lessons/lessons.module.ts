import { Module } from '@nestjs/common';
import { AdminLessonsController } from './admin-lessons.controller';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  controllers: [LessonsController, AdminLessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
