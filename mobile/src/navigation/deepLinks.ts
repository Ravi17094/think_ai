import { Linking } from 'react-native';

import { getSession, restoreSession } from '@/api/session';

import {
  DEEP_LINK_PREFIXES,
  DEEP_LINK_ROUTES,
  type ScreenName,
} from './linking';

export { DEEP_LINK_PREFIXES, DEEP_LINK_ROUTES };
export type { ScreenName };

/** Query parameters each screen understands (path params are always allowed). */
const ROUTE_QUERY_PARAMS: Readonly<Partial<Record<ScreenName, readonly string[]>>> = {
  CourseDetail: ['courseId', 'moduleId'],
  ForumThread: ['threadId'],
  ForumHome: ['categoryId', 'threadId'],
  Checkout: ['courseId'],
  PaymentSuccess: ['paymentId'],
  PaymentFailed: ['reason', 'errorCode', 'message'],
  VideoPlayer: ['courseId', 'lessonId'],
  Assessment: ['assessmentId'],
  Results: ['assessmentId', 'score', 'passed'],
  Certificate: ['courseId'],
};

/**
 * Routes that only make sense for a signed-in learner. Opening one while
 * signed out is bounced to the dashboard.
 */
const AUTH_GATED_ROUTES: ReadonlySet<ScreenName> = new Set<ScreenName>([
  'CreatePost',
  'Bookmarks',
  'Moderation',
  'Checkout',
  'VideoPlayer',
  'Assessment',
  'Results',
  'Certificate',
]);

export function isAuthGatedRoute(screen: ScreenName): boolean {
  return AUTH_GATED_ROUTES.has(screen);
}

export interface DeepLinkRoute {
  screen: ScreenName;
  params: Record<string, unknown>;
}

export type DeepLinkResolution =
  | { status: 'navigate'; route: DeepLinkRoute }
  | {
      status: 'auth-required';
      route: DeepLinkRoute;
      redirectTo: 'Login';
    }
  | { status: 'not-found'; url: string };

export interface ParsedDeepLink {
  url: string;
  /** Path with any scheme + leading/trailing slashes stripped. */
  path: string;
  segments: string[];
  query: Record<string, string>;
}

interface RoutePattern {
  screen: ScreenName;
  regex: RegExp;
  paramNames: string[];
  segmentCount: number;
  staticCount: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRoutePatterns(): RoutePattern[] {
  const patterns: RoutePattern[] = [];

  for (const [screen, path] of Object.entries(DEEP_LINK_ROUTES)) {
    if (typeof path !== 'string') {
      continue;
    }
    const segments = path.split('/');
    const paramNames: string[] = [];
    let staticCount = 0;

    const source = segments
      .map((segment) => {
        if (segment.startsWith(':') && segment.length > 1) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        if (segment === '*') {
          paramNames.push('wildcard');
          return '(.*)';
        }
        staticCount += 1;
        return escapeRegExp(segment);
      })
      .join('/');

    patterns.push({
      screen: screen as ScreenName,
      regex: new RegExp(`^${source}$`),
      paramNames,
      segmentCount: segments.length,
      staticCount,
    });
  }

  // Match the most specific pattern first so static routes win over params.
  return patterns.sort(
    (a, b) =>
      b.segmentCount - a.segmentCount || b.staticCount - a.staticCount
  );
}

interface AliasPattern extends RoutePattern {
  paramNames: string[];
}

const ALIAS_PATTERNS: AliasPattern[] = [
  {
    screen: 'CourseDetail',
    regex: /^course\/([^/]+)$/,
    paramNames: ['courseId'],
    segmentCount: 2,
    staticCount: 1,
  },
  {
    screen: 'ForumThread',
    regex: /^forum\/thread\/([^/]+)$/,
    paramNames: ['threadId'],
    segmentCount: 3,
    staticCount: 2,
  },
  {
    screen: 'Assessment',
    regex: /^assessment\/([^/]+)$/,
    paramNames: ['assessmentId'],
    segmentCount: 2,
    staticCount: 1,
  },
];

const ROUTE_PATTERNS = buildRoutePatterns();

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseQuery(raw: string | undefined): Record<string, string> {
  const query: Record<string, string> = {};
  if (!raw) {
    return query;
  }
  for (const pair of raw.split('&')) {
    if (pair === '') {
      continue;
    }
    const [rawKey = '', rawValue = ''] = pair.split('=');
    if (rawKey === '') {
      continue;
    }
    const key = safeDecode(rawKey);
    if (!(key in query)) {
      query[key] = safeDecode(rawValue);
    }
  }
  return query;
}

/**
 * Splits a candidate URL into path + query. Returns `null` for URLs that don't
 * use one of the app's prefixes.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  const prefix = DEEP_LINK_PREFIXES.find((candidate) =>
    url.startsWith(candidate)
  );
  if (!prefix) {
    return null;
  }

  const withoutPrefix = url.slice(prefix.length).replace(/^\/+/, '');
  const withoutFragment = withoutPrefix.split('#')[0] ?? '';
  const [rawPath = '', rawQuery] = withoutFragment.split('?');
  const path = rawPath.replace(/\/+$/, '');
  const segments = path === '' ? [] : path.split('/');

  return { url, path, segments, query: parseQuery(rawQuery) };
}

interface PathMatch {
  screen: ScreenName;
  paramNames: string[];
  values: string[];
}

function matchPath(path: string): PathMatch | null {
  for (const pattern of [...ROUTE_PATTERNS, ...ALIAS_PATTERNS]) {
    const match = pattern.regex.exec(path);
    if (match) {
      return {
        screen: pattern.screen,
        paramNames: pattern.paramNames,
        values: match.slice(1).map((value) => value ?? ''),
      };
    }
  }
  return null;
}

function buildParams(match: PathMatch, query: Record<string, string>): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  match.paramNames.forEach((name, index) => {
    const value = match.values[index];
    if (value !== undefined && value !== '') {
      params[name] = safeDecode(value);
    }
  });

  const allowed = ROUTE_QUERY_PARAMS[match.screen];
  if (allowed) {
    for (const key of allowed) {
      if (!(key in params) && key in query) {
        params[key] = query[key];
      }
    }
  }

  return params;
}

/**
 * Turns a URL into a navigation decision, applying the sign-in gate.
 */
export function resolveDeepLink(
  url: string,
  options: { isSignedIn?: boolean } = {}
): DeepLinkResolution {
  const parsed = parseDeepLink(url);
  if (!parsed) {
    return { status: 'not-found', url };
  }

  const match = matchPath(parsed.path);
  if (!match) {
    return { status: 'not-found', url };
  }

  const route: DeepLinkRoute = {
    screen: match.screen,
    params: buildParams(match, parsed.query),
  };

  const isSignedIn = options.isSignedIn ?? getSession().isSignedIn;
  if (isAuthGatedRoute(match.screen) && !isSignedIn) {
    return { status: 'auth-required', route, redirectTo: 'Login' };
  }

  return { status: 'navigate', route };
}

/**
 * Subscribes to OS URL events. Returns an unsubscribe function.
 */
export function subscribeToDeepLinks(
  handler: (resolution: DeepLinkResolution, url: string) => void
): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handler(resolveDeepLink(url), url);
  });
  return () => subscription.remove();
}

/**
 * Resolves the URL that launched the app, restoring the session first so the
 * sign-in gate sees the persisted identity.
 */
export async function getInitialDeepLink(): Promise<DeepLinkResolution | null> {
  const url = await Linking.getInitialURL();
  if (!url) {
    return null;
  }
  try {
    await restoreSession();
  } catch {
    // Fall through with the in-memory session.
  }
  return resolveDeepLink(url);
}
