import { ApiError } from './http';

/**
 * Turns transport failures into copy a learner can act on.
 *
 * Server-provided messages win for validation/content-policy failures (4xx)
 * because they are already user-facing; network, auth and 5xx failures get a
 * stable local message instead of leaking implementation details.
 */
export function toUserMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Something went wrong. Please try again.';
  }

  if (error.status === 0) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (error.status === 401) {
    return 'Your session expired. Please sign in again.';
  }
  if (error.status === 403) {
    return error.message || 'You do not have permission to do that.';
  }
  if (error.status === 404) {
    return error.message || 'We could not find what you were looking for.';
  }
  if (error.status === 408 || error.status === 429) {
    return 'The server is busy. Please try again in a moment.';
  }
  if (error.status >= 500) {
    return 'The server could not complete that request. Please try again.';
  }
  return error.message || 'Something went wrong. Please try again.';
}

/** Retry is safe for transport errors and temporary server failures. */
export function isRetryable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
  );
}
