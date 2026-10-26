import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { MeModule } from '../me/me.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [MeModule, CoursesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
