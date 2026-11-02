'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { CourseSummary, MyCourse, Paginated } from '@/lib/course-types';
import CourseGrid from './course-grid';
import { CourseGridSkeleton } from './course-skeletons';
import EmptyState from './empty-state';

/**
 * The Explore courses page body: heading, search box and the grid.
 * The first page arrives from the server (so there is no blank flash); searching and
 * "Load more" fetch from the API here in the browser.
 */
export default function ExploreCourses({
  heading,
  subheading,
  initial,
  initialQuery,
  states,
  pageSize,
}: {
  heading: string;
  subheading: string;
  initial: Paginated<CourseSummary>;
  initialQuery: string;
  states: Record<string, MyCourse>;
  pageSize: number;
}) {
  const [query, setQuery] = useState(initialQuery); // what is typed
  const [applied, setApplied] = useState(initialQuery); // what the list is filtered by
  const [items, setItems] = useState(initial.data);
  const [meta, setMeta] = useState(initial.meta);
  const [loading, setLoading] = useState(false); // replacing the whole list
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0); // ignore answers that arrive after a newer search started
  const skipFirst = useRef(true);

  const fetchPage = useCallback(
    (page: number, search: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.set('search', search);
      return apiFetch<Paginated<CourseSummary>>(`/courses?${params}`, { skipRefresh: true });
    },
    [pageSize],
  );

  const runSearch = useCallback(
    async (search: string) => {
      const id = ++latest.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPage(1, search);
        if (id !== latest.current) return;
        setItems(res.data);
        setMeta(res.meta);
      } catch (err) {
        if (id === latest.current) setError(getErrorMessage(err));
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [fetchPage],
  );

  // wait a moment after typing stops before searching
  useEffect(() => {
    const t = setTimeout(() => setApplied(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // the server already gave us the first page
      return;
    }
    void runSearch(applied);
  }, [applied, runSearch]);

  async function loadMore() {
    const id = latest.current;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchPage(meta.page + 1, applied);
      if (id !== latest.current) return;
      setItems((prev) => [...prev, ...res.data]);
      setMeta(res.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setApplied(query.trim()); // Enter searches straight away
  }

  const hasMore = meta.page < meta.totalPages;
  const noCoursesAtAll = !loading && !error && items.length === 0 && !applied;
  const noMatches = !loading && !error && items.length === 0 && !!applied;

  return (
    <>
      {/* section 1: white */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-10 pt-12">
          <h1 className="text-3xl font-bold text-brand-800">{heading}</h1>
          <p className="mt-2 text-brand-500">{subheading}</p>

          <form role="search" onSubmit={submit} className="mt-6 flex max-w-xl items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-brand-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses"
                aria-label="Search courses"
                className="h-11 w-full rounded-md border border-brand-200 bg-white pl-11 pr-10 text-sm text-black placeholder:text-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
                >
                  <CloseIcon className="size-4" />
                </button>
              )}
            </div>
            <Button type="submit" pill className="h-11 px-6">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* section 2: alternating tint */}
      <section className="bg-surface-alt">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold text-brand-800">{applied ? `Results for “${applied}”` : 'All courses'}</h2>
            {!loading && items.length > 0 && (
              <p aria-live="polite" className="text-sm text-brand-500">
                {meta.total} {meta.total === 1 ? 'course' : 'courses'}
              </p>
            )}
          </div>

          <div className="mt-8">
            {loading && <CourseGridSkeleton count={pageSize >= 6 ? 6 : pageSize} />}

            {!loading && items.length > 0 && <CourseGrid courses={items} states={states} />}

            {noCoursesAtAll && <EmptyState title="No courses yet, check back later" text="New courses will appear here as soon as they are published." />}

            {noMatches && (
              <EmptyState
                title={`No courses match “${applied}”`}
                text="Try a different word, or clear the search to see every course."
                action={
                  <Button variant="soft" pill onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                }
              />
            )}

            {error && (
              <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-5 py-4 text-sm text-red-700">
                <span>{error}</span>
                <Button variant="outline" pill className="border-red-300 px-4 py-1.5 text-red-700 hover:bg-red-100" onClick={() => runSearch(applied)}>
                  Try again
                </Button>
              </div>
            )}

            {!loading && items.length > 0 && hasMore && (
              <div className="mt-10 flex justify-center">
                <Button variant="soft" pill className="px-10 py-3" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
