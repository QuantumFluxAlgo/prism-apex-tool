/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from "react";

type Column = {
  /** Primary key used by A3 pages (e.g. "ticketId", "symbol"). */
  key?: string;
  /** Header label/node. Falls back to accessorKey/key if omitted. */
  header?: React.ReactNode;
  /** Legacy accessor key (keeps Vitest / earlier pages happy). */
  accessorKey?: string;
  /** Optional header cell class. */
  headerClassName?: string;
  /** Optional body cell class. */
  cellClassName?: string;
  /**
   * Legacy TanStack-style cell renderer:
   *   cell({ row: { original } })
   */
  cell?: (ctx: { row: { original: any } }) => React.ReactNode;
  /**
   * A3-style renderer used by Worklist V2 etc.:
   *   render(value, row)
   */
  render?: (value: any, row: any) => React.ReactNode;
};

interface DataTableProps {
  columns?: Column[];
  data?: any[];
  /**
   * Optional row click handler – used by A3 cockpits
   * to drive the right-hand details panel.
   */
  onRowClick?: (row: any) => void;
  /**
   * Optional deterministic row ID generator.
   * Falls back to index if omitted.
   */
  getRowId?: (row: any, index: number) => string | number;
}

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  getRowId,
}: DataTableProps) {
  const safeCols = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  const resolveHeader = (col: Column) => {
    if (col.header != null) return col.header;
    if (col.accessorKey) return col.accessorKey;
    if (col.key) return col.key;
    return "";
  };

  const resolveCell = (col: Column, row: any) => {
    // New A3-style renderer: render(value, row)
    if (typeof col.render === "function") {
      const key = col.key ?? col.accessorKey ?? "";
      const value = key ? row[key] : undefined;
      return col.render(value, row);
    }

    // Legacy TanStack-style: cell({ row: { original } })
    if (typeof col.cell === "function") {
      return col.cell({ row: { original: row } });
    }

    // Simple field lookup (works for both key and accessorKey)
    const key = col.accessorKey ?? col.key;
    return key ? row[key] : null;
  };

  return (
    <table
      data-testid="data-table"
      className="min-w-full border-collapse text-xs text-left"
    >
      <thead>
        <tr>
          {safeCols.map((col, idx) => (
            <th
              key={idx}
              className={col.headerClassName ?? "px-3 py-2 text-slate-400"}
            >
              {resolveHeader(col)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {safeData.map((row, rIdx) => {
          const rowKey = getRowId ? getRowId(row, rIdx) : rIdx;
          const clickable = typeof onRowClick === "function";

          return (
            <tr
              key={rowKey}
              className={
                clickable
                  ? "cursor-pointer hover:bg-slate-900/70 border-b border-slate-800/60"
                  : "border-b border-slate-800/60"
              }
              onClick={clickable ? () => onRowClick(row) : undefined}
            >
              {safeCols.map((col, cIdx) => (
                <td
                  key={cIdx}
                  className={col.cellClassName ?? "px-3 py-2 align-middle"}
                >
                  {resolveCell(col, row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

