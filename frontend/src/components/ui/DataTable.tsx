import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
  /** Mobile card renderer — required for <md stacked cards (no horizontal scroll). */
  mobileCard: (row: T) => ReactNode;
  empty?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  mobileCard,
  empty,
  className,
}: DataTableProps<T>) {
  if (!rows.length) {
    return <>{empty}</>;
  }

  return (
    <div className={className}>
      <div className="grid gap-3 md:hidden">{rows.map((row) => <div key={rowKey(row)}>{mobileCard(row)}</div>)}</div>

      <div className="card-panel hidden overflow-x-auto md:block !p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--cc-panel-border)] panel-muted">
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3 font-semibold', col.className)}>
                  {col.header}
                </th>
              ))}
              {actions ? <th className="px-4 py-3 text-right font-semibold">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[var(--cc-panel-border)]/60 transition duration-micro hover:bg-white/[0.03]"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">{actions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
