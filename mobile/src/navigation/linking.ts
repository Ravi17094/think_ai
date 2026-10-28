import type { LinkingOptions, PathConfigMap } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export type ScreenName = keyof RootStackParamList;

/** Every URL scheme the app answers to. */
export const DEEP_LINK_PREFIXES = [
  'thinkzai://',
  'thinkz://',
  'https://app.thinkzai.com',
] as const;

/** Short aliases accepted in addition to the canonical routes below. */
export const DEEP_LINK_ALIASES = [
  'course/:id',
  'forum/thread/:id',
  'assessment/:id',
] as const;

/**
 * Canonical screen ⇄ path table. Both the React Navigation `linking` config
 * and the custom URL parser (`deepLinks.ts`) derive from this map, so the two
 * can never drift apart.
 *
 * Examples:
 *   thinkzai://learner/dashboard
 *   thinkzai://learner/courses/course-1?moduleId=mod-1-0
 *   https://app.thinkzai.com/forum/threads/thread-9
 *   thinkzai://forum?categoryId=cat-1
 */
export const DEEP_LINK_ROUTES: Readonly<Partial<Record<ScreenName, string>>> = {
  LearnerDashboard: 'learner/dashboard',
  MyCourses: 'learner/courses',
  CourseDetail: 'learner/courses/:courseId',
  GlobalSearch: 'search',
  ForumHome: 'forum',
  ForumThread: 'forum/threads/:threadId',
  CreatePost: 'forum/new',
  Bookmarks: 'forum/bookmarks',
  Moderation: 'forum/moderate',
  Checkout: 'checkout',
  PaymentSuccess: 'checkout/success',
  PaymentFailed: 'checkout/failed',
  NotificationPreferences: 'settings/notifications',
};

/** React Navigation linking config, derived from the canonical route table. */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [...DEEP_LINK_PREFIXES],
  config: {
    screens: DEEP_LINK_ROUTES as PathConfigMap<RootStackParamList>,
  },
};
