import Link from 'next/link';

/** Pill filters that are plain links, so the server renders the right list for each. */
export default function LinkTabs({
  items,
}: {
  items: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {items.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          role="tab"
          aria-selected={t.active}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            t.active ? 'bg-brand-700 text-white hover:bg-brand-600' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className={t.active ? 'ml-1.5 text-brand-100' : 'ml-1.5 text-brand-500'}>{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
