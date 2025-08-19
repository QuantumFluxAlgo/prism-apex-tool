import React from 'react';

export function Card({ children, className = '' }) {
  return <div className={`border rounded p-4 shadow-sm ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}
