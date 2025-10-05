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
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  const variantClasses: Record<ButtonVariant, string> = {
    default:
      'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100 dark:hover:bg-zinc-800',
    primary:
      'border-blue-600 bg-blue-600 text-white hover:bg-blue-500 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500',
    ghost:
      'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-800',
  };

  const disabledClasses =
    'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-zinc-800 dark:bg-zinc-800 dark:text-gray-500';

  const baseClasses =
    'rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-70';

  const variantClass = variantClasses[variant] ?? variantClasses.default;

  const classes = `${baseClasses} ${sizeClasses} ${disabled ? disabledClasses : variantClass} ${className}`.trim();

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes} title={title}>
      {children}
    </button>
  );
}
