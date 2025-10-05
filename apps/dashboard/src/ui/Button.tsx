import React from 'react';

export default function Button({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1 text-sm transition-colors
        ${disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-zinc-800 dark:bg-zinc-800'
          : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-100 dark:hover:bg-zinc-800'}
      `}
    >
      {children}
    </button>
  );
}
