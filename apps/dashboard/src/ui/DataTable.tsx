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
  const finalColumns = React.useMemo(() => {
    if (Array.isArray(columns)) {
      try {
        console.debug(
          'DataTable: using provided columns',
          columns.map((col) => col?.header ?? col?.key ?? 'unknown'),
        );
      } catch {
        // console may be unavailable (SSR); ignore
      }
      return columns;
    }
    return [];
  }, [columns]);

  const isStructured = Array.isArray(columns) && Array.isArray(rows);

  if (isStructured) {
    const resolvedRows = rows ?? [];
    const resolvedColumns = finalColumns;
    const colSpan = resolvedColumns.length || 1;

    return (
      <div className={`dashboard-table-wrapper ${className}`.trim()}>
        <table className="dashboard-table">
          <thead>
            <tr>
              {resolvedColumns.map((column) => (
                <th
                  key={column.key}
                  className={`${
                    column.align === 'right'
                      ? 'text-right'
                      : column.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${column.className ?? ''}`.trim()}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan}>Loading…</td>
              </tr>
            ) : resolvedRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} style={{ color: 'var(--apex-text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              resolvedRows.map((row, index) => (
                <tr key={rowKey ? rowKey(row, index) : (index as React.Key)}>
                  {resolvedColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`${
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${column.className ?? ''}`.trim()}
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
    <div className={`dashboard-table-wrapper ${className}`.trim()}>
      <table className="dashboard-table">
        <thead>{headers}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
