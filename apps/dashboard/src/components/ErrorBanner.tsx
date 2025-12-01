// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Error Banner
 *
 * Minimal, defensive banner used by AppErrorBoundary and page-level errors.
 */

import React from 'react';

type ErrorBannerProps = {
  message: string;
  onDismiss?: () => void;
};

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const safeMessage = message || 'Something went wrong.';

  return (
    <div className="w-full bg-red-950/60 border-b border-red-500/40 text-red-50 text-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-400/70 text-xs font-semibold">
            !
          </span>
          <span className="truncate">{safeMessage}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-medium text-red-100 hover:text-red-300"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
