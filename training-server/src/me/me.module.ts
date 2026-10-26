import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { ProfileModule } from '../profile/profile.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [ProfileModule, CoursesModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
