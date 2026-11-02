import Link from 'next/link';

/** Previous / next links. `hrefFor(page)` builds the address, keeping the other filters. */
export default function Pagination({
  page,
  totalPages,
  total,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return total > 0 ? <p className="mt-4 text-sm text-brand-500">{total} in total</p> : null;
  const link = 'rounded-full px-4 py-2 text-sm font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100';
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
      <p className="text-sm text-brand-500">
        Page {page} of {totalPages} · {total} in total
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={link}>
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link href={hrefFor(page + 1)} className={link}>
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
