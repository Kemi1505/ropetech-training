'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/button';
import { apiFetch } from '@/lib/api';
import { NotificationItem } from '@/lib/app-types';
import { timeAgo } from '@/lib/dates';

export default function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((i) => !i.read).length;

  async function open(item: NotificationItem) {
    if (!item.read) await apiFetch(`/notifications/${item.id}/read`, { method: 'POST' }).catch(() => undefined);
    if (item.link) router.push(item.link);
    router.refresh();
  }

  async function readAll() {
    setBusy(true);
    await apiFetch('/notifications/read-all', { method: 'POST' }).catch(() => undefined);
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="soft" pill onClick={readAll} disabled={busy}>
            Mark all as read
          </Button>
        </div>
      )}
      <ul className="space-y-3">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className="flex w-full items-start gap-4 rounded-lg bg-white p-4 text-left shadow-md shadow-brand-900/10 transition-shadow hover:shadow-lg"
            >
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read ? 'bg-brand-100' : 'bg-accent-600'}`} aria-label={n.read ? 'Read' : 'Unread'} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.read ? 'font-medium text-black' : 'font-semibold text-brand-800'}`}>{n.title}</span>
                <span className="mt-0.5 block text-sm text-brand-500">{n.body}</span>
                <span className="mt-1 block text-xs text-brand-400">{timeAgo(n.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
