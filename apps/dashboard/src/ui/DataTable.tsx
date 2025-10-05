import React from 'react';

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
};

type DataTableProps<T> = {
  columns?: DataTableColumn<T>[];
  rows?: T[];
  rowKey?: (row: T, index: number) => React.Key;
  loading?: boolean;
  emptyMessage?: string;
  headers?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export default function DataTable<T = unknown>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = 'No data available.',
  headers,
  children,
  className = '',
}: DataTableProps<T>) {
  const isStructured = Array.isArray(columns) && Array.isArray(rows);

  if (isStructured) {
    const resolvedRows = rows ?? [];
    const resolvedColumns = columns ?? [];
    const colSpan = resolvedColumns.length || 1;

    return (
      <div className={`overflow-auto ${className}`}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
            <tr>
              {resolvedColumns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 font-medium ${column.className ?? ''} ${
                    column.align === 'right'
                      ? 'text-right'
                      : column.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-900 dark:divide-zinc-800 dark:text-gray-100">
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={colSpan}>
                  Loading…
                </td>
              </tr>
            ) : resolvedRows.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={colSpan}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              resolvedRows.map((row, index) => (
                <tr key={rowKey ? rowKey(row, index) : (index as React.Key)}>
                  {resolvedColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-3 py-2 ${
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${column.className ?? ''}`}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (!headers || !children) {
    return null;
  }

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600 dark:bg-zinc-800 dark:text-gray-300">{headers}</thead>
        <tbody className="divide-y divide-gray-100 text-gray-900 dark:divide-zinc-800 dark:text-gray-100">
          {children}
        </tbody>
      </table>
    </div>
  );
}
