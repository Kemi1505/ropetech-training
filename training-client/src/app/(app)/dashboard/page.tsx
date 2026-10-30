import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AdminDashboardView from '@/components/dashboard/admin-dashboard';
import LearnerDashboardView from '@/components/dashboard/learner-dashboard';
import { AdminDashboard, LearnerDashboard } from '@/lib/app-types';
import { serverApi } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

// One URL, two dashboards: the API returns the right one for the logged-in role.
export default async function DashboardPage() {
  const data = await serverApi<LearnerDashboard | AdminDashboard>('/dashboard');
  if (!data) notFound();
  return data.type === 'admin' ? <AdminDashboardView data={data} /> : <LearnerDashboardView data={data} />;
}