import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

export default function Badge(props: BadgeProps) {
  return <span data-testid="badge" {...props} />;
}

