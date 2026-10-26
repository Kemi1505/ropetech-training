import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../common/api-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @ApiOperation({ summary: 'Admin stats for admins/superadmins, enrolled courses for learners (see "type")' })
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.get(user);
  }
}
