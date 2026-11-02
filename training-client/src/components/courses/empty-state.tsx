import { BookIcon } from '@/components/icons';

export default function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white px-6 py-16 text-center shadow-md shadow-brand-900/10">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <BookIcon className="size-7" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-brand-800">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm text-brand-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
