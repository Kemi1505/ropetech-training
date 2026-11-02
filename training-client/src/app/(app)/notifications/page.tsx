import type { Metadata } from 'next';
import EmptyState from '@/components/courses/empty-state';
import NotificationList from '@/components/notifications/notification-list';
import { h1 } from '@/components/ui/styles';
import { NotificationItem } from '@/lib/app-types';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const res = await serverApi<{ data: NotificationItem[] }>('/notifications?limit=50');
  const items = res?.data ?? [];
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={h1}>Notifications</h1>
      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState title="No notifications yet" text="Payment, certification and assessment updates will show up here." />
        ) : (
          <NotificationList items={items} />
        )}
      </div>
    </section>
  );
}
