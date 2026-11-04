import type {
  Course,
  CourseCategory,
  CourseCategoryId,
  CourseModule,
  CourseSortOption,
  Enrollment,
  Lesson,
} from '@/types';

/**
 * Catalogue presentation helpers.
 *
 * Everything here is a pure function of the existing API payloads, which keeps
 * the screens declarative and the behaviour easy to unit test.
 */

export const COURSE_CATEGORIES: readonly CourseCategory[] = [
  {
    id: 'mobile',
    label: 'Mobile Development',
    icon: '📱',
    tags: ['react-native', 'mobile', 'animations'],
  },
  {
    id: 'web',
    label: 'Web Development',
    icon: '🌐',
    tags: ['javascript', 'typescript', 'node', 'api', 'backend', 'es6'],
  },
  {
    id: 'data',
    label: 'Data & Algorithms',
    icon: '📊',
    tags: ['algorithms', 'data'],
  },
  {
    id: 'testing',
    label: 'Testing & Quality',
    icon: '🧪',
    tags: ['testing', 'jest', 'accessibility'],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '⚡',
    tags: ['performance', 'navigation'],
  },
] as const;

export const COURSE_SORT_OPTIONS: readonly {
  key: CourseSortOption;
  label: string;
}[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'highest-rated', label: 'Highest rated' },
  { key: 'shortest', label: 'Shortest' },
  { key: 'title', label: 'A–Z' },
];

export function getCourseCategory(course: Course): CourseCategory {
  const tags = new Set(course.tags.map((tag) => tag.toLowerCase()));
  const match = COURSE_CATEGORIES.find((category) =>
    category.tags.some((tag) => tags.has(tag))
  );
  return match ?? COURSE_CATEGORIES[0]!;
}

export function getCourseCategoryId(course: Course): CourseCategoryId {
  return getCourseCategory(course).id;
}

export function isCategoryMatch(
  course: Course,
  categoryId: CourseCategoryId | 'all'
): boolean {
  return categoryId === 'all' || getCourseCategoryId(course) === categoryId;
}

export function flattenLessons(course: Course): Lesson[] {
  return course.modules.flatMap((module) => module.lessons);
}

export function findLesson(
  course: Course,
  lessonId: string | undefined
): Lesson | null {
  if (!lessonId) {
    return null;
  }
  return flattenLessons(course).find((lesson) => lesson.id === lessonId) ?? null;
}

export function findLessonModule(
  course: Course,
  lessonId: string
): CourseModule | null {
  return (
    course.modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === lessonId)
    ) ?? null
  );
}

export function findLessonPosition(
  course: Course,
  lessonId: string
): { index: number; total: number; lesson: Lesson | null } {
  const lessons = flattenLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return {
    index,
    total: lessons.length,
    lesson: index >= 0 ? lessons[index] ?? null : null,
  };
}

export function getAdjacentLessons(
  course: Course,
  lessonId: string
): { previous: Lesson | null; next: Lesson | null } {
  const lessons = flattenLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) {
    return { previous: null, next: null };
  }
  return {
    previous: lessons[index - 1] ?? null,
    next: lessons[index + 1] ?? null,
  };
}

export function getFirstLesson(course: Course): Lesson | null {
  return flattenLessons(course)[0] ?? null;
}

export function getResumeLesson(
  course: Course,
  enrollment: Enrollment | undefined
): Lesson | null {
  const lessons = flattenLessons(course);
  if (lessons.length === 0) {
    return null;
  }
  const completed = new Set(enrollment?.completedLessonIds ?? []);
  return lessons.find((lesson) => !completed.has(lesson.id)) ?? lessons[0]!;
}

export function getLearningObjectives(course: Course): string[] {
  if (course.learningObjectives && course.learningObjectives.length > 0) {
    return course.learningObjectives;
  }
  const topic = course.tags[0] ?? course.title;
  return [
    `Build confidence with ${topic} through guided, hands-on exercises.`,
    `Apply ${course.level}-level patterns to a realistic capstone project.`,
    `Learn the debugging and testing habits that keep production apps healthy.`,
    `Walk away with a portfolio-ready project you can extend.`,
  ];
}

export function sortCourses(
  courses: Course[],
  option: CourseSortOption
): Course[] {
  const copy = [...courses];
  switch (option) {
    case 'highest-rated':
      copy.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title));
      break;
    case 'shortest':
      copy.sort(
        (a, b) =>
          a.durationMinutes - b.durationMinutes || a.title.localeCompare(b.title)
      );
      break;
    case 'title':
      copy.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'recommended':
    default:
      copy.sort(
        (a, b) =>
          Number(b.isEnrolled) - Number(a.isEnrolled) ||
          b.rating - a.rating ||
          b.enrolledCount - a.enrolledCount
      );
      break;
  }
  return copy;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return 'Self-paced';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function formatLevel(level: Course['level']): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function formatRating(rating: number): string {
  return Number.isFinite(rating) ? rating.toFixed(1) : 'New';
}
