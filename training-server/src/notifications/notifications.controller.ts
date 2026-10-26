import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '../common/api-auth.decorator';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type AuthUser } from '../auth/types';
import { PaginationDto } from '../common/pagination.dto';

@ApiTags('Notifications')
@ApiAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @ApiOperation({ summary: 'Your notifications (newest first) with the unread count' })
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: PaginationDto) {
    return this.notifications.list(user.id, q);
  }

  @ApiOperation({ summary: 'Just the unread count, for the bell badge' })
  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @ApiOperation({ summary: 'Mark all as read' })
  @HttpCode(200)
  @Post('read-all')
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  @ApiOperation({ summary: 'Mark one as read' })
  @HttpCode(200)
  @Post(':id/read')
  read(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user.id, id);
  }
}
