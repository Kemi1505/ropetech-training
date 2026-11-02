import type { Metadata } from 'next';
import Link from 'next/link';
import { LinkButton } from '@/components/button';
import EmptyState from '@/components/courses/empty-state';
import StatusChip from '@/components/courses/status-chip';
import { Table, Td, TwoLine } from '@/components/ui/data-table';
import LinkTabs from '@/components/ui/link-tabs';
import Pagination from '@/components/ui/pagination';
import { inputClass } from '@/components/ui/styles';
import { AdminCourseRow, Paged } from '@/lib/app-types';
import { formatDate } from '@/lib/dates';
import { qs, pageOf } from '@/lib/query';
import { serverApi } from '@/lib/session';
import { titleCase } from '@/lib/format';

export const metadata: Metadata = { title: 'Courses' };

const STATUS_CHIP = {
  PUBLISHED: { kind: 'done', label: 'Published' },
  DRAFT: { kind: 'draft', label: 'Draft' },
  UNPUBLISHED: { kind: 'unpublished', label: 'Unpublished' },
} as const;

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ status?: string; search?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = ['PUBLISHED', 'DRAFT', 'UNPUBLISHED'].includes(sp.status ?? '') ? sp.status! : '';
  const search = (sp.search ?? '').trim();
  const page = pageOf(sp.page);

  const [list, counts] = await Promise.all([
    serverApi<Paged<AdminCourseRow>>(`/admin/courses${qs({ status, search, page, limit: 10 })}`),
    serverApi<{ all: number; published: number; unpublished: number; draft: number }>('/admin/courses/counts'),
  ]);
  const rows = list?.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-brand-800">Courses</h1>
        <LinkButton href="/admin/courses/new" pill className="px-6">
          + Create Course
        </LinkButton>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <form action="/admin/courses" method="get" role="search" className="flex w-full max-w-sm gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="search" defaultValue={search} placeholder="Search courses..." aria-label="Search courses" className={inputClass} />
          <button type="submit" className="rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-600">
            Search
          </button>
        </form>
        <LinkTabs
          items={[
            { label: 'All', href: `/admin/courses${qs({ search })}`, active: !status, count: counts?.all },
            { label: 'Published', href: `/admin/courses${qs({ status: 'PUBLISHED', search })}`, active: status === 'PUBLISHED', count: counts?.published },
            { label: 'Drafts', href: `/admin/courses${qs({ status: 'DRAFT', search })}`, active: status === 'DRAFT', count: counts?.draft },
            { label: 'Unpublished', href: `/admin/courses${qs({ status: 'UNPUBLISHED', search })}`, active: status === 'UNPUBLISHED', count: counts?.unpublished },
          ]}
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            title={search || status ? 'No courses match' : 'No courses yet'}
            text={search || status ? 'Try another search or filter.' : 'Create your first course to get started.'}
            action={<LinkButton href="/admin/courses/new" pill>+ Create Course</LinkButton>}
          />
        ) : (
          <>
            <Table head={['Course', 'Status', 'Enrolled', 'Updated']}>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-brand-50/50">
                  <Td>
                    <Link href={`/admin/courses/${c.id}`} className="block">
                      <TwoLine main={c.name} sub={`${titleCase(c.difficulty)} · ${c.lessonCount} ${c.lessonCount === 1 ? 'lesson' : 'lessons'}${c.isFeatured ? ' · Featured' : ''}`} />
                    </Link>
                  </Td>
                  <Td>
                    <StatusChip kind={STATUS_CHIP[c.status].kind}>{STATUS_CHIP[c.status].label}</StatusChip>
                  </Td>
                  <Td>{c.status === 'DRAFT' ? '-' : c.enrollmentCount}</Td>
                  <Td className="text-brand-500">{formatDate(c.updatedAt)}</Td>
                </tr>
              ))}
            </Table>
            <Pagination page={list!.meta.page} totalPages={list!.meta.totalPages} total={list!.meta.total} hrefFor={(p) => `/admin/courses${qs({ status, search, page: p })}`} />
          </>
        )}
      </div>
    </div>
  );
}
