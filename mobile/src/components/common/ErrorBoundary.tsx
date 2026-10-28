import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from './ErrorState';
import { reportError } from '@/utils/errorReporting';

export interface ErrorBoundaryFallbackProps {
  error: Error;
  /** Clears the error and re-renders the subtree. */
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Renders in place of `children` after a crash. Defaults to the shared
   * `<ErrorState>` with a "Try again" affordance.
   */
  fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  /** Side-channel for logging/telemetry, called after `reportError`. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /**
   * When any value changes between renders the boundary auto-resets — useful
   * when the same boundary wraps a route that takes an `id` param.
   */
  resetKeys?: readonly unknown[];
  /** Label included in the error report, e.g. the route name. */
  context?: string;
  testID?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function haveResetKeysChanged(
  previous: readonly unknown[] | undefined,
  next: readonly unknown[] | undefined
): boolean {
  if (previous === next) {
    return false;
  }
  if (!previous || !next || previous.length !== next.length) {
    return true;
  }
  return previous.some((value, index) => value !== next[index]);
}

/**
 * Catches render/lifecycle errors in the subtree, reports them, and shows a
 * recoverable fallback instead of unmounting the whole app.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      context: this.props.context,
      componentStack: info.componentStack ?? undefined,
    });
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (
      this.state.error &&
      haveResetKeysChanged(previous.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }
    return (
      <ErrorState
        message={error.message || 'Something went wrong.'}
        onRetry={this.reset}
        retryLabel="Try again"
        testID={this.props.testID ?? 'error-boundary'}
      />
    );
  }
}

export default ErrorBoundary;
