import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MyCoursesDto } from './dto/my-courses.dto';
import { ApiAuth } from '../common/api-auth.decorator';
import { MeService } from './me.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';
import { ListCoursesDto } from '../courses/dto/list-courses.dto';

@ApiTags('Me')
@ApiAuth()
@Controller('me')
export class MeController {
  constructor(private me: MeService) {}

  @ApiOperation({ summary: 'You and your profile in one call (profile is null until it is completed)' })
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.me.me(user);
  }

  @ApiOperation({ summary: 'My courses. Filter with ?filter=all|in-progress|completed' })
  @Get('courses')
  courses(@CurrentUser() user: AuthUser, @Query() q: MyCoursesDto) {
    return this.me.myCourses(user.id, q);
  }

  @ApiOperation({ summary: 'Published courses you have not enrolled in (Explore). Supports ?search= and ?difficulty=' })
  @Get('explore')
  explore(@CurrentUser() user: AuthUser, @Query() q: ListCoursesDto) {
    return this.me.explore(user.id, q);
  }

  @ApiOperation({ summary: 'Enrollments page: every enrolled course with payment state, plus the amount still owed' })
  @Get('enrollments')
  enrollments(@CurrentUser() user: AuthUser) {
    return this.me.enrollments(user.id);
  }

  @ApiOperation({ summary: 'Continue learning: the course and next lesson to open (or a course that needs payment)' })
  @Get('continue')
  continue(@CurrentUser() user: AuthUser) {
    return this.me.continueLearning(user.id);
  }
}
