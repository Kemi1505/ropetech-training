export type ChipKind = 'pending' | 'ready' | 'done' | 'rejected' | 'neutral' | 'draft' | 'unpublished';

const styles: Record<ChipKind, string> = {
  pending: 'bg-accent-100 text-accent-600',
  ready: 'bg-brand-100 text-brand-700',
  done: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  neutral: 'bg-brand-50 text-brand-700',
  draft: 'bg-surface-alt text-brand-500',
  unpublished: 'bg-brand-100 text-brand-500',
};

export default function StatusChip({ kind, children }: { kind: ChipKind; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[kind]}`}>
      {children}
    </span>
  );
}
