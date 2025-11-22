import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import YahooStatus from '../components/YahooStatus';
import { DASHBOARD_NAV_ITEMS } from './dashboardNavConfig';

export default function Tabs() {
  const { pathname } = useLocation();
  return (
    <div className="dashboard-tabs">
      {DASHBOARD_NAV_ITEMS.map((it) => {
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
