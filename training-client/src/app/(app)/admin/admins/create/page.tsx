import type { Metadata } from 'next';
import CreateAdminForm from '@/components/admin/create-admin-form';

export const metadata: Metadata = { title: 'Create admin' };

export default function CreateAdminPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-3xl font-bold text-brand-800">Create admin</h1>
      <p className="mt-2 text-brand-500">Give a new admin an email and a temporary password. They add their name on first login.</p>
      <div className="mt-8 rounded-lg bg-white p-8 shadow-md shadow-brand-900/10">
        <CreateAdminForm />
      </div>
    </div>
  );
}
