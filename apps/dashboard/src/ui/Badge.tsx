import React from 'react';

type BadgeTone =
  | 'blue'
  | 'gray'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'green'
  | 'red'
  | 'neutral'
  | 'indigo'
  | 'cyan';

type BadgeSize = 'xs' | 'sm';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: BadgeSize;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'text-[0.6rem] px-2 py-0.25',
  sm: 'text-[0.68rem] px-3 py-0.4',
};

export default function Badge({
  tone = 'gray',
  size = 'sm',
  className,
  ...rest
}: BadgeProps) {
  const classes = cx(
    'a3-chip',
    tone ? `a3-chip--${tone}` : null,
    sizeClasses[size],
    className,
  );

  return <span data-testid="badge" className={classes} {...rest} />;
}
