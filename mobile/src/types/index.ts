/**
 * Domain models shared across the five assigned learner/community pages.
 * Field names mirror the existing Express backend so the mock client can be
 * swapped for the real OpenAPI client without touching screens or components.
 */

export type LessonType = 'video' | 'article' | 'quiz' | 'code';

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  durationMinutes: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  lessons: Lesson[];
}

export interface Instructor {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  title: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnailUrl: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  rating: number;
  enrolledCount: number;
  isEnrolled: boolean;
  instructor: Instructor;
  modules: CourseModule[];
  tags: string[];
}

export type EnrollmentStatus = 'not-started' | 'in-progress' | 'completed';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  batchName: string;
  status: EnrollmentStatus;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string;
}

export type CourseStatusFilter = 'all' | 'in-progress' | 'completed';

export interface CourseSearchParams {
  query: string;
  status: CourseStatusFilter;
}

export interface CourseSearchResult {
  courses: Course[];
  total: number;
}

export type SearchResultType = 'course' | 'lesson' | 'forum' | 'assessment';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  /** Route the result navigates to when tapped. */
  href: string;
}

export interface GlobalSearchResponse {
  results: Record<SearchResultType, SearchResult[]>;
  totals: Record<SearchResultType, number>;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface ForumAuthor {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface ForumThread {
  id: string;
  title: string;
  excerpt: string;
  categoryId: string;
  tags: string[];
  author: ForumAuthor;
  upvotes: number;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isSolved: boolean;
  createdAt: string;
  lastActivityAt: string;
}

export type ForumSort = 'newest' | 'most-voted' | 'recently-active';

export interface ForumThreadPage {
  threads: ForumThread[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ForumThreadQuery {
  page: number;
  pageSize: number;
  categoryId: string | null;
  tags: string[];
  sort: ForumSort;
}

export interface CreateThreadInput {
  title: string;
  body: string;
  categoryId: string;
  tags: string[];
}

/** Async state envelope used by every data hook in this app. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T;
  status: AsyncStatus;
  error: string | null;
  isRefreshing: boolean;
}
