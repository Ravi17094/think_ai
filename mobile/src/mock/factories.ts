import type {
  Course,
  CourseModule,
  Enrollment,
  EnrollmentStatus,
  ForumAuthor,
  ForumCategory,
  ForumThread,
  Instructor,
  Lesson,
  LessonType,
  SearchResult,
  SearchResultType,
} from '@/types';

const FIRST_NAMES = [
  'Asha',
  'Rohit',
  'Meera',
  'Karthik',
  'Divya',
  'Sanjay',
  'Priya',
  'Nikhil',
  'Fatima',
  'Rahul',
] as const;

const LAST_NAMES = [
  'Menon',
  'Sharma',
  'Iyer',
  'Reddy',
  'Nair',
  'Kulkarni',
  'Bose',
  'Dsouza',
] as const;

const COURSE_SEEDS = [
  {
    title: 'React Native Mastery',
    subtitle: 'Ship production mobile apps with TypeScript',
    level: 'advanced',
    durationMinutes: 1140,
    tags: ['react-native', 'typescript', 'mobile'],
  },
  {
    title: 'Modern JavaScript Patterns',
    subtitle: 'Closures, modules and functional techniques',
    level: 'intermediate',
    durationMinutes: 660,
    tags: ['javascript', 'es6'],
  },
  {
    title: 'Node.js API Design',
    subtitle: 'Build resilient REST services with Express',
    level: 'intermediate',
    durationMinutes: 840,
    tags: ['node', 'api', 'backend'],
  },
  {
    title: 'React Navigation Deep Dive',
    subtitle: 'Stack, tab and deep-link routing in React Native',
    level: 'beginner',
    durationMinutes: 420,
    tags: ['react-native', 'navigation'],
  },
  {
    title: 'Data Structures with TypeScript',
    subtitle: 'Trees, graphs and heaps for real interviews',
    level: 'intermediate',
    durationMinutes: 900,
    tags: ['typescript', 'algorithms'],
  },
  {
    title: 'Testing React Native Apps',
    subtitle: 'Unit and integration testing with Jest',
    level: 'beginner',
    durationMinutes: 480,
    tags: ['testing', 'jest', 'react-native'],
  },
] as const;

const MODULE_TITLES = [
  'Foundations & Environment Setup',
  'Core Patterns in Practice',
  'Working with Remote Data',
  'Performance & Profiling',
  'Shipping to App Stores',
] as const;

const LESSON_TITLES = [
  'Introduction and Outcomes',
  'Hands-on Walkthrough',
  'Common Mistakes to Avoid',
  'Checkpoint Quiz',
  'Capstone Exercise',
] as const;

const LESSON_TYPES: readonly LessonType[] = ['video', 'article', 'quiz', 'code'];

const AVATAR_PALETTE = [
  '#7C3AED',
  '#4F46E5',
  '#0891B2',
  '#DB2777',
  '#059669',
  '#D97706',
] as const;

/**
 * Deterministic PRNG (mulberry32). Mock data must be stable across renders and
 * identical between test runs, so `Math.random` is deliberately not used.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) {
    throw new Error('pick() called with an empty collection');
  }
  return item;
}

function intBetween(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function createInstructorFactory(seed = 1) {
  const random = createSeededRandom(seed);
  return (index: number): Instructor => {
    const name = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
    return {
      id: `ins-${index}`,
      name,
      title: pick(random, [
        'Principal Engineer',
        'Senior Instructor',
        'Staff Engineer',
        'Developer Advocate',
      ]),
      bio: `${name} has spent a decade building large-scale mobile and web platforms, and teaches the practical patterns that survived real production launches.`,
      avatarUrl: `https://i.pravatar.cc/150?u=instructor-${index}`,
    };
  };
}

export function createLessonFactory(seed = 1) {
  const random = createSeededRandom(seed);
  return (moduleIndex: number, lessonIndex: number): Lesson => ({
    id: `les-${moduleIndex}-${lessonIndex}`,
    title: `${pick(random, LESSON_TITLES)} ${lessonIndex + 1}`,
    type: pick(random, LESSON_TYPES),
    durationMinutes: intBetween(random, 5, 45),
  });
}

export function createModuleFactory(seed = 1) {
  const random = createSeededRandom(seed);
  const createLesson = createLessonFactory(seed + 7);

  return (courseIndex: number, moduleIndex: number): CourseModule => {
    const lessonCount = intBetween(random, 3, 5);
    const lessons: Lesson[] = [];
    for (let i = 0; i < lessonCount; i += 1) {
      lessons.push(createLesson(courseIndex, moduleIndex * 10 + i));
    }
    const durationMinutes = lessons.reduce((sum, l) => sum + l.durationMinutes, 0);

    return {
      id: `mod-${courseIndex}-${moduleIndex}`,
      title: MODULE_TITLES[moduleIndex % MODULE_TITLES.length] ?? 'Module',
      description: `Covers the key ideas in step ${moduleIndex + 1} of the curriculum, with worked examples you can apply immediately.`,
      durationMinutes,
      lessons,
    };
  };
}

export function createCourseFactory(seed = 1, idPrefix = 'course') {
  const random = createSeededRandom(seed);
  const createInstructor = createInstructorFactory(seed + 3);
  const createModule = createModuleFactory(seed + 11);

  return (index: number, overrides: Partial<Course> = {}): Course => {
    const seedEntry = COURSE_SEEDS[index % COURSE_SEEDS.length];
    if (seedEntry === undefined) {
      throw new Error(`No course seed available for index ${index}`);
    }
    const moduleCount = intBetween(random, 3, 5);
    const modules: CourseModule[] = [];
    for (let i = 0; i < moduleCount; i += 1) {
      modules.push(createModule(index, i));
    }

    // The prefix keeps ids unique when the same seed index is used for both an
    // enrollment and the browsable catalogue.
    const id = `${idPrefix}-${index + 1}`;
    const base: Course = {
      id,
      title: seedEntry.title,
      subtitle: seedEntry.subtitle,
      description: `A hands-on ${seedEntry.level}-level course covering ${seedEntry.tags.join(', ')}. Includes ${moduleCount} modules of guided exercises and a capstone project.`,
      thumbnailUrl: `https://picsum.photos/seed/${id}/640/360`,
      level: seedEntry.level,
      durationMinutes: seedEntry.durationMinutes,
      rating: Number((3.5 + random() * 1.5).toFixed(1)),
      enrolledCount: intBetween(random, 120, 4800),
      isEnrolled: false,
      instructor: createInstructor(index),
      modules,
      tags: [...seedEntry.tags],
    };

    return { ...base, ...overrides, modules: overrides.modules ?? base.modules };
  };
}

export function createEnrollmentFactory(seed = 1) {
  const random = createSeededRandom(seed);
  const createCourse = createCourseFactory(seed + 5);

  return (
    index: number,
    overrides: Partial<Enrollment> = {},
    courseOverrides: Partial<Course> = {}
  ): Enrollment => {
    const course = createCourse(index, { ...courseOverrides, isEnrolled: true });
    const totalLessons = course.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    const status: EnrollmentStatus =
      overrides.status ??
      pick(random, ['not-started', 'in-progress', 'in-progress', 'completed']);

    const progressPercent =
      overrides.progressPercent ??
      (status === 'completed'
        ? 100
        : status === 'not-started'
          ? 0
          : intBetween(random, 10, 92));

    const completedLessons =
      overrides.completedLessons ??
      Math.round((totalLessons * progressPercent) / 100);

    const daysAgo = intBetween(random, 0, 21);
    const lastAccessedAt = new Date(
      Date.UTC(2026, 0, 1 + daysAgo, 9, 30)
    ).toISOString();

    return {
      id: `enr-${index + 1}`,
      userId: 'user-1',
      courseId: course.id,
      batchName: `Batch ${String(2026 + (index % 2)).slice(2)}-${pick(random, ['A', 'B', 'C'])}`,
      status,
      progressPercent,
      completedLessons,
      totalLessons,
      lastAccessedAt,
      ...overrides,
      course: { ...course, ...(overrides.course ?? {}) },
    };
  };
}

export function createForumCategoryFactory(seed = 1) {
  const random = createSeededRandom(seed);
  return (index: number): ForumCategory => {
    const name = pick(random, [
      'Announcements',
      'Q&A',
      'Help & Support',
      'Projects',
      'General',
    ]);
    return {
      id: `cat-${index + 1}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      color: AVATAR_PALETTE[index % AVATAR_PALETTE.length] ?? '#7C3AED',
    };
  };
}

export function createForumThreadFactory(seed = 1) {
  const random = createSeededRandom(seed);
  const base = Date.UTC(2026, 1, 1, 8, 0);

  return (index: number, categoryIds: string[], tagPool: string[]): ForumThread => {
    const authorName = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
    const author: ForumAuthor = {
      id: `user-${index + 1}`,
      name: authorName,
      avatarUrl: `https://i.pravatar.cc/96?u=forum-${index}`,
    };

    const tagCount = intBetween(random, 1, 3);
    const tags: string[] = [];
    for (let i = 0; i < tagCount; i += 1) {
      const tag = pick(random, tagPool);
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    const hoursAgo = index * 3 + intBetween(random, 0, 2);
    const createdAt = new Date(base + hoursAgo * 3600_000).toISOString();
    const lastActivityAt = new Date(
      base + (hoursAgo + intBetween(random, 0, 6)) * 3600_000
    ).toISOString();

    const categoryId =
      categoryIds[Math.floor(random() * categoryIds.length)] ?? 'cat-1';

    return {
      id: `thread-${index + 1}`,
      title: pick(random, [
        'Best approach for offline-first sync?',
        'Why does my list re-render on every keystroke?',
        'Recommend a testing strategy for native modules',
        'Show off what you built this week',
        'How do you structure large component libraries?',
        'Debounce vs throttle for search inputs',
        'Migrating a legacy app to the new architecture',
        'Accessibility wins on your last release',
      ]) + ` #${index + 1}`,
      excerpt:
        'Sharing what worked, what did not, and the trade-offs I ran into while shipping this.',
      categoryId,
      tags,
      author,
      upvotes: intBetween(random, 0, 240),
      replyCount: intBetween(random, 0, 68),
      viewCount: intBetween(random, 20, 3200),
      isPinned: index < 3,
      isSolved: random() > 0.6,
      createdAt,
      lastActivityAt,
    };
  };
}

export function createSearchResultFactory(_seed = 1) {
  const byType: Record<SearchResultType, string[]> = {
    course: [
      'React Native Mastery',
      'Node.js API Design',
      'Testing React Native Apps',
      'Expo Router deep dives',
      'Offline-first mobile architecture',
    ],
    lesson: [
      'Deep dive into useEffect dependencies',
      'Debounce vs throttle for search inputs',
      'Wiring FlatList infinite scroll',
      'Optimising list rendering',
      'Native module interop',
    ],
    forum: [
      'Best approach for offline-first sync?',
      'Why does my list re-render on every keystroke?',
      'Show off what you built this week',
      'Debounce vs throttle for search inputs',
      'Migrating a legacy app to the new architecture',
    ],
    assessment: [
      'React Navigation checkpoint',
      'TypeScript fundamentals quiz',
      'Async & await assessment',
      'Accessibility checkpoint',
      'State management quiz',
    ],
  };

  const metaByType: Record<SearchResultType, string> = {
    course: 'Course · 24 lessons · 4.6',
    lesson: 'Lesson · 18 min · Video',
    forum: 'Forum · 32 replies',
    assessment: 'Assessment · 20 questions',
  };

  return (
    type: SearchResultType,
    index: number,
    query: string
  ): SearchResult => {
    const titles = byType[type];
    const title = titles[index % titles.length] ?? `${query} result`;
    const id = `${type}-${index + 1}`;
    const hrefByType: Record<SearchResultType, (value: string) => string> = {
      course: (v) => `/learner/courses/${v}`,
      lesson: (v) => `/learner/courses/${v}`,
      forum: (v) => `/forum?thread=${v}`,
      assessment: (v) => `/learner/courses/${v}?module=assessment`,
    };

    return {
      id,
      type,
      title,
      // The subtitle stays query-independent so it cannot make every result
      // match an arbitrary search term; the mock client matches on keywords.
      subtitle: metaByType[type],
      href: hrefByType[type](id),
    };
  };
}
