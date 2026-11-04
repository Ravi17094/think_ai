import {
  createCourseFactory,
  createEnrollmentFactory,
  createForumCategoryFactory,
  createForumThreadFactory,
  createSearchResultFactory,
} from '@/mock/factories';
import { FORUM_PAGE_SIZE } from '@/theme/tokens';
import type {
  Course,
  CourseSearchParams,
  CourseSearchResult,
  CreateThreadInput,
  Enrollment,
  EnrollmentStatus,
  ForumCategory,
  ForumThread,
  ForumThreadPage,
  ForumThreadQuery,
  GlobalSearchResponse,
  SearchResult,
  SearchResultType,
  UpdateLessonProgressInput,
} from '@/types';
import type { LearningApiClient } from './client';
import { createCommunityClient } from './communityClient';

const SEARCH_TYPES: readonly SearchResultType[] = [
  'course',
  'lesson',
  'forum',
  'assessment',
];

const TAG_POOL = [
  'react-native',
  'typescript',
  'navigation',
  'testing',
  'performance',
  'accessibility',
  'jest',
  'api',
  'forms',
  'animations',
] as const;

const ALL_TAGS: string[] = [...TAG_POOL];

/** Fixed "now" so mock mutations stay deterministic in snapshots and tests. */
const MOCK_NOW = '2026-02-10T09:30:00.000Z';

/**
 * Searchable keywords per result type. Titles alone would leave whole tabs
 * empty for common queries, so results match on `title + keywords` exactly like
 * a real search index would.
 */
const SEARCH_KEYWORDS: Record<SearchResultType, string> = {
  course: 'react native typescript testing navigation performance forms animations api accessibility',
  lesson: 'react native hooks useeffect typescript testing navigation performance debounce',
  forum: 'react native testing navigation performance typescript jest accessibility api forms',
  assessment: 'react native typescript navigation testing performance jest checkpoint',
};

export interface MockApiOptions {
  /** Simulated round-trip latency in ms. Tests pass 0 to run instantly. */
  latencyMs?: number;
  /** Enrollment count used by the dashboard. `0` exercises the empty state. */
  enrollmentCount?: number;
  /** Course count exposed to search/filter. */
  courseCount?: number;
  /** Total forum threads available before pagination. */
  forumThreadCount?: number;
  /** Force every request to reject — exercises error states. */
  forceError?: string | null;
}

export interface MockApiClient extends LearningApiClient {
  /** Threads created at runtime, prepended to page 1 of the list. */
  readonly createdThreads: ForumThread[];
  reset(): void;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchesStatus(enrollment: Enrollment, status: CourseSearchParams['status']) {
  if (status === 'all') {
    return true;
  }
  return enrollment.status === (status as EnrollmentStatus);
}

function matchesQuery(haystack: string, query: string): boolean {
  if (query.trim() === '') {
    return true;
  }
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

function sortThreads(threads: ForumThread[], sort: ForumThreadQuery['sort']): ForumThread[] {
  const copy = [...threads];
  switch (sort) {
    case 'most-voted':
      copy.sort((a, b) => b.upvotes - a.upvotes);
      break;
    case 'recently-active':
      copy.sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );
      break;
    case 'newest':
    default:
      copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
  }
  // Pinned threads always lead, as required by the forum module guidelines.
  return copy.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
}

export function createMockApiClient(
  options: MockApiOptions = {}
): MockApiClient {
  const {
    latencyMs = 250,
    enrollmentCount = 4,
    courseCount = 12,
    forumThreadCount = 45,
    forceError = null,
  } = options;

  const createEnrollment = createEnrollmentFactory(21);
  // Catalogue courses use a distinct id prefix so they never collide with the
  // `course-N` ids carried by enrollment payloads in the unfiltered "all" list.
  const createCourse = createCourseFactory(9, 'catalog');
  const createCategory = createForumCategoryFactory(5);
  const createThread = createForumThreadFactory(33);
  const createSearchResult = createSearchResultFactory(11);

  const categories: ForumCategory[] = Array.from({ length: 5 }, (_, i) =>
    createCategory(i)
  );
  const categoryIds = categories.map((c) => c.id);

  const allCourses: Course[] = Array.from({ length: courseCount }, (_, i) =>
    createCourse(i)
  );
  const allEnrollments: Enrollment[] = Array.from(
    { length: enrollmentCount },
    (_, i) => createEnrollment(i, undefined, { isEnrolled: true })
  );
  const allThreads: ForumThread[] = Array.from(
    { length: forumThreadCount },
    (_, i) => createThread(i, categoryIds, ALL_TAGS)
  );

  const createdThreads: ForumThread[] = [];

  const guard = async (): Promise<void> => {
    await delay(latencyMs);
    if (forceError !== null) {
      throw new Error(forceError);
    }
  };

  return {
    // Pages 6–10 always talk to the live backend (no mock data); only the
    // Page 1–5 catalogue below is generated locally.
    ...createCommunityClient(),

    createdThreads,

    reset() {
      createdThreads.length = 0;
    },

    async fetchEnrollments(): Promise<Enrollment[]> {
      await guard();
      return allEnrollments;
    },

    async searchCourses(
      params: CourseSearchParams
    ): Promise<CourseSearchResult> {
      await guard();

      // Status filters only ever apply to the learner's own enrollments;
      // the wider catalogue is reachable from the "All" tab only.
      const catalog =
        params.status === 'all'
          ? allCourses.filter((course) => !course.isEnrolled)
          : [];

      const enrolled = allEnrollments
        .filter((enrollment) => matchesStatus(enrollment, params.status))
        .map((enrollment) => enrollment.course);

      const filtered = [...enrolled, ...catalog].filter((course) => {
        const haystack = `${course.title} ${course.subtitle} ${course.tags.join(' ')}`;
        return matchesQuery(haystack, params.query);
      });

      return { courses: filtered, total: filtered.length };
    },

    async fetchCourse(courseId: string): Promise<Course> {
      await guard();
      const fromEnrollments = allEnrollments.find(
        (e) => e.courseId === courseId
      );
      if (fromEnrollments) {
        return fromEnrollments.course;
      }
      const course = allCourses.find((c) => c.id === courseId);
      if (!course) {
        throw new Error(`Course "${courseId}" was not found.`);
      }
      return course;
    },

    async enrollCourse(courseId: string): Promise<Enrollment> {
      await guard();

      const existing = allEnrollments.find((e) => e.courseId === courseId);
      if (existing) {
        return existing;
      }

      const courseIndex = allCourses.findIndex((c) => c.id === courseId);
      const course = allCourses[courseIndex];
      if (!course) {
        throw new Error(`Course "${courseId}" was not found.`);
      }

      // Replace rather than mutate: screens may still hold the pre-enrollment
      // course object and must not flip to the enrolled state before the
      // screen's own transition has finished.
      const enrolledCourse: Course = { ...course, isEnrolled: true };
      allCourses[courseIndex] = enrolledCourse;

      const totalLessons = enrolledCourse.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0
      );
      const enrollment: Enrollment = {
        id: `enr-new-${allEnrollments.length + 1}`,
        userId: 'user-1',
        courseId: enrolledCourse.id,
        course: enrolledCourse,
        batchName: 'Batch 26-A',
        status: 'not-started',
        progressPercent: 0,
        completedLessons: 0,
        totalLessons,
        completedLessonIds: [],
        // Fixed timestamp keeps mock responses deterministic across runs.
        lastAccessedAt: MOCK_NOW,
      };
      allEnrollments.push(enrollment);
      return enrollment;
    },

    async updateLessonProgress(
      input: UpdateLessonProgressInput
    ): Promise<Enrollment> {
      await guard();

      const index = allEnrollments.findIndex(
        (e) => e.courseId === input.courseId
      );
      const enrollment = allEnrollments[index];
      if (!enrollment) {
        throw new Error(
          `No enrollment found for course "${input.courseId}".`
        );
      }

      const lessonIds = enrollment.course.modules.flatMap((module) =>
        module.lessons.map((lesson) => lesson.id)
      );
      const completed = new Set(enrollment.completedLessonIds ?? []);
      if (input.completed) {
        completed.add(input.lessonId);
      } else {
        completed.delete(input.lessonId);
      }

      const completedLessonIds = lessonIds.filter((id) => completed.has(id));
      const completedLessons = completedLessonIds.length;
      const totalLessons = lessonIds.length || enrollment.totalLessons;
      const progressPercent =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;
      const status: EnrollmentStatus =
        progressPercent >= 100
          ? 'completed'
          : progressPercent > 0
            ? 'in-progress'
            : 'not-started';

      const updated: Enrollment = {
        ...enrollment,
        status,
        progressPercent,
        completedLessons,
        totalLessons,
        completedLessonIds,
        lastAccessedAt: MOCK_NOW,
      };
      allEnrollments[index] = updated;
      return updated;
    },

    async fetchAllTags(): Promise<string[]> {
      await guard();
      return ALL_TAGS;
    },

    async searchGlobal(
      query: string,
      type: SearchResultType
    ): Promise<GlobalSearchResponse> {
      await guard();

      const trimmed = query.trim();
      if (trimmed === '') {
        return {
          results: {
            course: [],
            lesson: [],
            forum: [],
            assessment: [],
          },
          totals: { course: 0, lesson: 0, forum: 0, assessment: 0 },
        };
      }

      const build = (searchType: SearchResultType): SearchResult[] => {
        const rows: SearchResult[] = [];
        for (let i = 0; i < 5; i += 1) {
          const result = createSearchResult(searchType, i, trimmed);
          if (
            matchesQuery(
              `${result.title} ${SEARCH_KEYWORDS[searchType]}`,
              trimmed
            )
          ) {
            rows.push(result);
          }
        }
        return rows;
      };

      const results = SEARCH_TYPES.reduce<Record<SearchResultType, SearchResult[]>>(
        (acc, searchType) => {
          acc[searchType] = searchType === type ? build(searchType) : [];
          return acc;
        },
        { course: [], lesson: [], forum: [], assessment: [] }
      );

      const totals = SEARCH_TYPES.reduce<Record<SearchResultType, number>>(
        (acc, searchType) => {
          acc[searchType] = results[searchType].length;
          return acc;
        },
        { course: 0, lesson: 0, forum: 0, assessment: 0 }
      );

      return { results, totals };
    },

    async fetchForumCategories(): Promise<ForumCategory[]> {
      await guard();
      return categories;
    },

    async fetchForumThreads(
      query: ForumThreadQuery
    ): Promise<ForumThreadPage> {
      await guard();

      let filtered = [...createdThreads, ...allThreads];

      if (query.categoryId !== null) {
        filtered = filtered.filter((t) => t.categoryId === query.categoryId);
      }

      if (query.tags.length > 0) {
        filtered = filtered.filter((t) =>
          query.tags.every((tag) => t.tags.includes(tag))
        );
      }

      filtered = sortThreads(filtered, query.sort);

      const total = filtered.length;
      const start = (query.page - 1) * query.pageSize;
      const slice = filtered.slice(start, start + query.pageSize);

      return {
        threads: slice,
        page: query.page,
        pageSize: query.pageSize,
        total,
        hasMore: start + slice.length < total,
      };
    },

    async createThread(input: CreateThreadInput): Promise<{ id: string }> {
      await guard();
      const id = `thread-new-${createdThreads.length + 1}`;
      createdThreads.unshift({
        id,
        title: input.title,
        excerpt: input.body.slice(0, 140),
        categoryId: input.categoryId,
        tags: input.tags,
        author: {
          id: 'user-1',
          name: 'You',
          avatarUrl: 'https://i.pravatar.cc/96?u=me',
        },
        upvotes: 0,
        replyCount: 0,
        viewCount: 0,
        isPinned: false,
        isSolved: false,
        // Newer than every seeded thread so a freshly created post leads the
        // default "newest" ordering, the way a real backend would return it.
        createdAt: new Date('2026-02-07T09:00:00.000Z').toISOString(),
        lastActivityAt: new Date('2026-02-07T09:00:00.000Z').toISOString(),
      });
      return { id };
    },
  };
}

export const DEFAULT_FORUM_PAGE_SIZE = FORUM_PAGE_SIZE;
