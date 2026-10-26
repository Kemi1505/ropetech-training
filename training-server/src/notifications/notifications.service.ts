import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../generated/enums';
import { pageArgs, pageMeta, PaginationDto } from '../common/pagination.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /** Used by other services when something happens. Never throws: a failed notification must not break the action. */
  async create(userId: string, n: { type: NotificationType; title: string; body: string; link?: string }) {
    try {
      await this.prisma.notification.create({ data: { userId, ...n } });
    } catch (err) {
      this.logger.warn(`Could not create notification: ${(err as Error).message}`);
    }
  }

  async list(userId: string, q: PaginationDto) {
    const where = { userId };
    const [total, unread, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        ...pageArgs(q),
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
      }),
    ]);
    return { data: rows.map((r) => ({ ...r, read: r.readAt !== null })), unreadCount: unread, meta: pageMeta(q, total) };
  }

  async unreadCount(userId: string) {
    return { unreadCount: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  async markRead(userId: string, id: string) {
    // userId in the filter means nobody can mark someone else's notification
    const { count } = await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    if (count === 0) {
      const exists = await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { unreadCount: 0 };
  }
}
