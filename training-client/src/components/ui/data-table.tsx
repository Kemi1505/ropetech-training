// import { ReactNode } from 'react';

// /** Table shell: a soft card, a tinted header row, very light row lines. Scrolls sideways on phones. */
// export function Table({ head, children }: { head: string[]; children: ReactNode }) {
//   return (
//     <div className="overflow-x-auto rounded-lg bg-white shadow-md shadow-brand-900/10">
//       <table className="w-full min-w-[640px] text-left text-sm">
//         <thead className="bg-surface-alt text-xs uppercase tracking-wide text-brand-500">
//           <tr>
//             {head.map((h, i) => (
//               <th key={`${h}-${i}`} scope="col" className="px-5 py-3 font-semibold">
//                 {h}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-brand-100">{children}</tbody>
//       </table>
//     </div>
//   );
// }

// export const Td = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
//   <td className={`px-5 py-3.5 align-middle text-black ${className}`}>{children}</td>
// );

// /** Name on top, a quiet second line underneath */
// export const TwoLine = ({ main, sub }: { main: ReactNode; sub?: ReactNode }) => (
//   <div>
//     <p className="font-semibold text-brand-800">{main}</p>
//     {sub && <p className="text-xs text-brand-500">{sub}</p>}
//   </div>
// );




import {
  ReactNode,
  Children,
  isValidElement,
  cloneElement,
} from 'react';

export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  const rows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;

    const rowChildren = (row.props as { children?: ReactNode }).children;

    const cells = Children.map(rowChildren, (cell, index) => {
      if (!isValidElement(cell)) return cell;

      return cloneElement(
        cell as React.ReactElement<{ label?: string }>,
        { label: head[index] || 'Details' },
      );
    });

    const originalClassName =
      (row.props as { className?: string }).className ?? '';

    return cloneElement(
      row as React.ReactElement<{
        children?: ReactNode;
        className?: string;
      }>,
      {
        className: `block rounded-xl border border-brand-100 p-3 shadow-sm even:bg-brand-50/70 odd:bg-white md:table-row md:rounded-none md:border-0 md:border-b md:p-0 md:shadow-none md:bg-white ${originalClassName}`,
      },
      cells,
    );
  });

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md shadow-brand-900/10">
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="hidden bg-surface-alt text-xs uppercase tracking-wide text-brand-500 md:table-header-group">
          <tr>
            {head.map((h, i) => (
              <th
                key={`${h}-${i}`}
                scope="col"
                className="px-5 py-4 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="block space-y-4 p-3 md:table-row-group md:space-y-0 md:p-0">
          {rows}
        </tbody>
      </table>
    </div>
  );
}

export const Td = ({
  children,
  className = '',
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) => (
  <td
    data-label={label}
    className={`flex items-start justify-between gap-6 border-b border-brand-100/70 px-3 py-4 text-right text-black last:border-b-0 before:shrink-0 before:font-semibold before:text-brand-500 before:content-[attr(data-label)] md:table-cell md:border-b-0 md:px-5 md:py-3.5 md:text-left md:before:hidden ${className}`}
  >
    <div className="min-w-0 max-w-[70%] break-words md:max-w-none">
      {children}
    </div>
  </td>
);

export const TwoLine = ({
  main,
  sub,
}: {
  main: ReactNode;
  sub?: ReactNode;
}) => (
  <div className="min-w-0">
    <p className="break-words font-semibold text-brand-800">
      {main}
    </p>
    {sub && (
      <p className="break-all text-xs text-brand-500">
        {sub}
      </p>
    )}
  </div>
);
