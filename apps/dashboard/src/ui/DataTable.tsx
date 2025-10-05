import React from 'react';

export default function DataTable({ headers, children }: { headers: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">{headers}</thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-gray-900 dark:text-gray-100">{children}</tbody>
      </table>
    </div>
  );
}
