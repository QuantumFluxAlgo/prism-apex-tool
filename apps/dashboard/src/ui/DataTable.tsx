import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
}: {
  columns?: any[];
  data?: any[];
}) {
  const safeCols = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <table data-testid="data-table">
      <thead>
        <tr>
          {safeCols.map((col, idx) => (
            <th key={idx}>{col.header ?? col.accessorKey ?? ''}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {safeData.map((row, rIdx) => (
          <tr key={rIdx}>
            {safeCols.map((col, cIdx) => {
              const value =
                typeof col.cell === 'function'
                  ? col.cell({ row: { original: row } })
                  : row[col.accessorKey];
              return <td key={cIdx}>{value}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

