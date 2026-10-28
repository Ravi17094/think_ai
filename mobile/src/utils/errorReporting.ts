/**
 * Central funnel for unexpected runtime errors.
 *
 * Error boundaries (and anything else that catches a throw) call `reportError`
 * instead of logging directly, so a crash reporter can be plugged in at the
 * app root via `setErrorReporter` without touching every catch site.
 */
export interface ErrorReport {
  /** Always an `Error` instance, even when a non-Error value was thrown. */
  error: Error;
  /** Where the failure happened, e.g. `"forum-thread"` or `"root"`. */
  context?: string;
  /** React's component stack, when captured by an error boundary. */
  componentStack?: string;
  /** ISO timestamp captured at report time. */
  occurredAt: string;
}

export type ErrorReporter = (report: ErrorReport) => void;

function defaultReporter(report: ErrorReport): void {
  console.error(
    `[error]${report.context ? ` (${report.context})` : ''}`,
    report.error,
    report.componentStack ?? ''
  );
}

let activeReporter: ErrorReporter = defaultReporter;

/** Installs a crash reporter (Sentry, Bugsnag, …) for the whole app. */
export function setErrorReporter(next: ErrorReporter): void {
  activeReporter = next;
}

/** The currently installed reporter — handy for assertions and chaining. */
export function getErrorReporter(): ErrorReporter {
  return activeReporter;
}

/** Restores the default console reporter. Test-only helper. */
export function __resetErrorReporterForTests(): void {
  activeReporter = defaultReporter;
}

/** Normalises anything that can be thrown into an `Error`. */
export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error('Unknown error');
  }
}

/**
 * Reports a caught error and returns the normalised `Error` so callers can
 * keep passing it around. Never throws.
 */
export function reportError(
  error: unknown,
  options: { context?: string; componentStack?: string } = {}
): Error {
  const normalized = toError(error);
  activeReporter({
    error: normalized,
    context: options.context,
    componentStack: options.componentStack,
    occurredAt: new Date().toISOString(),
  });
  return normalized;
}
