import type { Metadata } from 'next';
import Link from 'next/link';
import BasicStep from '@/components/admin/course-editor/basic-step';
import Stepper from '@/components/admin/course-editor/stepper';

export const metadata: Metadata = { title: 'Create course' };

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/courses" className="text-sm font-semibold text-brand-700 hover:text-brand-500">← Courses</Link>
      <h1 className="mt-3 text-3xl font-bold text-brand-800">Create course</h1>
      <p className="mt-2 text-brand-500">Each step saves as a draft, so you can leave and come back later.</p>
      <div className="mt-8"><Stepper current="basic" /></div>
      <div className="mt-8 rounded-lg bg-white p-8 shadow-md shadow-brand-900/10">
        <h2 className="mb-6 text-xl font-bold text-brand-800">Basic info</h2>
        <BasicStep />
      </div>
    </div>
  );
}
