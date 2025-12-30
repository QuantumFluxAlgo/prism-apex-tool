import React from 'react';

export default function FiltersBar({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const classes = ['a3-filter-bar', className].filter(Boolean).join(' ');
  return (
    <div data-testid="filters-bar" className={classes} {...rest}>
      {children}
    </div>
  );
}
