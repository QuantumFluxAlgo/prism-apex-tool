import React from 'react';

export function Tooltip(props: React.HTMLAttributes<HTMLDivElement>) {
  return <span data-testid="tooltip" {...props} />;
}

export default Tooltip;

