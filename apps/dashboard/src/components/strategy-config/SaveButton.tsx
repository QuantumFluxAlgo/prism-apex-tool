import React from 'react';

interface SaveButtonProps {
  label?: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  label = 'Save',
  loadingLabel = 'Saving…',
  loading = false,
  disabled = false,
  onClick,
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? loadingLabel : label}
    </button>
  );
};
