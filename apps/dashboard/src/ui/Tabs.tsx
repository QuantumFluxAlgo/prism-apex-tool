import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import YahooStatus from '../components/YahooStatus';

const items = [
  { path: '/worklist', label: 'Worklist' },
  { path: '/tickets', label: 'Tickets' },
  { path: '/positions', label: 'Positions' },
  { path: '/reports', label: 'Reports' },
  { path: '/metrics', label: 'Metrics' },
];

export default function Tabs() {
  const { pathname } = useLocation();
  return (
    <div className="dashboard-tabs">
      {items.map((it) => {
        const active = it.path === '/' ? pathname === '/' : pathname.startsWith(it.path);
        return (
          <Link
            key={it.path}
            to={it.path}
            className={`dashboard-tab${active ? ' is-active' : ''}`}
          >
            {it.label}
          </Link>
        );
      })}
      <YahooStatus />
    </div>
  );
}
