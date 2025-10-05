import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { path: '/', label: 'Tickets' },
  { path: '/positions', label: 'Positions' },
  { path: '/reports', label: 'Reports' },
  { path: '/metrics', label: 'Metrics' },
];

export default function Tabs() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-2 border-b border-gray-200 dark:border-zinc-800 px-2">
      {items.map((it) => {
        const active = it.path === '/' ? pathname === '/' : pathname.startsWith(it.path);
        return (
          <Link
            key={it.path}
            to={it.path}
            className={`px-3 py-2 rounded-t-lg text-sm ${
              active
                ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
