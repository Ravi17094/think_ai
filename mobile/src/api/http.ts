import { getSession, restoreSession } from './session';

/**
 * Minimal `fetch` transport for Pages 6–10.
 *
 * Contract (confirmed against `think_ai/backend`):
 *   - Base URL: `EXPO_PUBLIC_API_URL` (default `http://localhost:5000/api`).
 *   - Auth: `x-user-id` header identifies the caller; an `Authorization`
 *     bearer token is attached whenever a session carries one.
 *   - Envelope: success `{ success: true, data, ...extras }`,
 *     failure `{ success: false, message, ...extras }` with 4xx/5xx.
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  status?: string;
  notificationsCreated?: number;
  syncedAt?: string;
  [extra: string]: unknown;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue>;
}

/** HTTP + payload error carrying the raw body so callers can branch on `status`. */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: ApiEnvelope<unknown> | null;

  constructor(message: string, status: number, payload: ApiEnvelope<unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function buildRequestUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) {
    return base;
  }
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
}

/** Headers every forum/payments request carries — auth proof per endpoint docs. */
export async function buildHeaders(hasBody: boolean): Promise<Record<string, string>> {
  await restoreSession();
  const { userId, token } = getSession();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-user-id': userId,
  };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, query } = options;
  const hasBody = body !== undefined;
  const url = buildRequestUrl(path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: await buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — is the backend running?', 0, null);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  if (payload === null) {
    throw new ApiError('Unexpected response from the server.', response.status, null);
  }

  return payload;
}

/** `apiRequest` that unwraps the `{ success, data }` envelope. */
export async function apiData<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const payload = await apiRequest<T>(path, options);
  return payload.data;
}
