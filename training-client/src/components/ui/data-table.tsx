import { ReactNode } from 'react';

/** Table shell: a soft card, a tinted header row, very light row lines. Scrolls sideways on phones. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-md shadow-brand-900/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-alt text-xs uppercase tracking-wide text-brand-500">
          <tr>
            {head.map((h, i) => (
              <th key={`${h}-${i}`} scope="col" className="px-5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <td className={`px-5 py-3.5 align-middle text-black ${className}`}>{children}</td>
);

/** Name on top, a quiet second line underneath */
export const TwoLine = ({ main, sub }: { main: ReactNode; sub?: ReactNode }) => (
  <div>
    <p className="font-semibold text-brand-800">{main}</p>
    {sub && <p className="text-xs text-brand-500">{sub}</p>}
  </div>
);
