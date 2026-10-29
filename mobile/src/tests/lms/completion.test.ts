import { hasCompletedLesson } from "@/lms/completion";
import type { Lesson } from "@/lms/types";
const lesson: Lesson = { id: 1, title: "Lesson", videoUrl: null, durationSeconds: 100, completionThreshold: 95, order: 0 };
test("offline completion follows the server's lesson rule instead of a fixed 90%", () => {
  expect(hasCompletedLesson(lesson, 90)).toBe(false);
  expect(hasCompletedLesson(lesson, 95)).toBe(true);
  expect(hasCompletedLesson({ ...lesson, completionThreshold: 70 }, 80)).toBe(true);
});
test("pre-migration offline caches retain their original 90% rule until refreshed", () => {
  const cached = { ...lesson };
  delete (cached as Partial<Lesson>).completionThreshold;
  expect(hasCompletedLesson(cached, 89)).toBe(false);
  expect(hasCompletedLesson(cached, 90)).toBe(true);
  expect(hasCompletedLesson({ ...lesson, completionThreshold: NaN }, 100)).toBe(false);
});
