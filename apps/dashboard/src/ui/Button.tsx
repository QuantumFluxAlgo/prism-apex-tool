import React from 'react';

export type ButtonSize = 'sm' | 'md';
export type ButtonVariant = 'default' | 'primary' | 'ghost';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
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
}: ButtonProps) {
  const classes = ['dashboard-button'];
  if (size === 'sm') classes.push('sm');
  if (variant === 'primary') classes.push('primary');
  if (variant === 'ghost') classes.push('ghost');
  if (className) classes.push(className);

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes.join(' ')} title={title}>
      {children}
    </button>
  );
}
