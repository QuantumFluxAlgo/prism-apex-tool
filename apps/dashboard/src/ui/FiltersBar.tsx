import React from 'react';

export default function FiltersBar() {
  return (
    <div className="flex flex-wrap gap-2 items-center p-3 border-b border-gray-200 dark:border-zinc-800">
      <span className="text-xs text-gray-500">UTC (GMT)</span>
      <input
        type="date"
        className="px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      />
      <input
        type="date"
        className="px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      />
      <select className="px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <option>All Symbols</option>
        <option>ES=F</option>
        <option>NQ=F</option>
        <option>GC=F</option>
        <option>CL=F</option>
      </select>
      <select className="px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <option>All Strategies</option>
        <option>ORR</option>
      </select>
      <select className="px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <option>Any Status</option>
        <option>OPEN</option>
        <option>CLOSED</option>
        <option>COMPLETE</option>
      </select>
    </div>
  );
}
