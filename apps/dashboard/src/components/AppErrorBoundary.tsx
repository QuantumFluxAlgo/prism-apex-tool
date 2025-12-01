// @ts-nocheck
/* eslint-disable */
/**
 * PRISM APEX V2 — Global App Error Boundary
 *
 * Design goals:
 * - Never throw while handling an error (no map/replace on undefined).
 * - Show a simple, dismissible banner.
 * - Log the raw error to console for debugging.
 */

import React from 'react';
import ErrorBanner from './ErrorBanner';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const safeMessage = AppErrorBoundary.normaliseErrorMessage(error);
    return { hasError: true, message: safeMessage };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Log the full raw error and component stack for diagnostics
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary] Unhandled render error', {
      error,
      info,
    });
  }

  private static normaliseErrorMessage(error: unknown): string {
    if (!error) {
      return 'Unknown error';
    }

    // Best-effort extraction without assuming structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr: any = error;

    if (typeof anyErr === 'string') return anyErr;
    if (typeof anyErr.message === 'string') return anyErr.message;

    try {
      return JSON.stringify(anyErr);
    } catch {
      return String(anyErr);
    }
  }

  private handleDismiss = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    const { hasError, message } = this.state;

    return (
      <>
        {hasError && (
          <ErrorBanner
            message={message || 'Something went wrong.'}
            onDismiss={this.handleDismiss}
          />
        )}
        {this.props.children}
      </>
    );
  }
}
