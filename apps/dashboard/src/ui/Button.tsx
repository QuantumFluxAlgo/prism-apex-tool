import React from 'react';

export type ButtonSize = 'sm' | 'md';
export type ButtonVariant = 'default' | 'primary' | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export default function Button({
  children,
  onClick,
  disabled,
  size = 'md',
  variant = 'default',
  className = '',
  title,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['dashboard-button'];
  if (size === 'sm') classes.push('sm');
  if (variant === 'primary') classes.push('primary');
  if (variant === 'ghost') classes.push('ghost');
  if (className) classes.push(className);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes.join(' ')}
      title={title}
      {...rest}
    >
      {children}
    </button>
  );
}
