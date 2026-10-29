import type { Lesson } from "./types";

export function hasCompletedLesson(lesson: Lesson, watchedSeconds: number) {
  // Old offline caches predate configurable lesson rules and used 90%.
  // Fresh API responses always include the persisted Prisma rule.
  const threshold = lesson.completionThreshold ?? 90;
  return (
    lesson.durationSeconds > 0 &&
    Number.isFinite(threshold) && threshold > 0 && threshold <= 100 &&
    watchedSeconds >= lesson.durationSeconds * (threshold / 100)
  );
}
