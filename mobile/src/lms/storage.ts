import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Draft, HistoryEntry, ProgressUpdate } from "./types";
// All learner data is scoped to the actual authenticated account, including on shared devices.
export const storageKey = (userId: string, kind: string) =>
  `thinkz:lms:v1:${encodeURIComponent(userId)}:${kind}`;
const locks = new Map<string, Promise<unknown>>();
export async function read<T>(
  key: string,
  validate: (data: unknown) => data is T,
  fallback: T,
): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    const data: unknown = JSON.parse(raw);
    if (validate(data)) return data;
  } catch {
    /* Delete invalid JSON below. */
  }
  await AsyncStorage.removeItem(key);
  return fallback;
}
export function mutate<T>(
  key: string,
  validator: (data: unknown) => data is T,
  fallback: T,
  change: (data: T) => T,
): Promise<T> {
  const next = (locks.get(key) || Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const data = change(await read(key, validator, fallback));
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return data;
    });
  locks.set(key, next);
  void next
    .finally(() => {
      if (locks.get(key) === next) locks.delete(key);
    })
    .catch(() => undefined);
  return next;
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const validDate = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const languages = ["python", "javascript", "java", "cpp"];
export const isHistory = (v: unknown): v is HistoryEntry[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      object(x) &&
      typeof x.id === "string" &&
      languages.includes(String(x.language)) &&
      typeof x.code === "string" &&
      (x.input === undefined || typeof x.input === "string") &&
      (x.expectedOutput === undefined || typeof x.expectedOutput === "string") &&
      typeof x.output === "string" &&
      validDate(x.timestamp),
  );
export const isQueue = (v: unknown): v is ProgressUpdate[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      object(x) &&
      Number.isInteger(x.lessonId) &&
      Number.isInteger(x.enrollmentId) &&
      typeof x.watchedSeconds === "number" &&
      x.watchedSeconds >= 0 &&
      validDate(x.updatedAt) &&
      (x.baseVersion === null || validDate(x.baseVersion)),
  );
export const isDraft = (v: unknown): v is Draft | null =>
  v === null ||
  (object(v) &&
    Number.isInteger(v.attemptId) &&
    validDate(v.expiresAt) &&
    validDate(v.savedAt) &&
    Array.isArray(v.flags) &&
    v.flags.every(Number.isInteger) &&
    object(v.answers) &&
    Object.values(v.answers).every(
      (a) =>
        object(a) &&
        Number.isInteger(a.questionId) &&
        (a.selectedOptionId === undefined ||
          Number.isInteger(a.selectedOptionId)) &&
        (a.code === undefined || typeof a.code === "string") &&
        (a.language === undefined || languages.includes(String(a.language))),
    ));
export const draftKey = (userId: string, assessmentId: number) =>
  storageKey(userId, `draft:${assessmentId}`);
export const loadDraft = (userId: string, id: number) =>
  read(draftKey(userId, id), isDraft, null);
export async function saveDraft(userId: string, id: number, draft: Draft) {
  await mutate(draftKey(userId, id), isDraft, null, () => draft);
}
export const clearDraft = (userId: string, id: number) =>
  mutate(draftKey(userId, id), isDraft, null, () => null);
export const loadHistory = (userId: string) =>
  read(storageKey(userId, "history"), isHistory, []);
export const appendHistory = (userId: string, entry: HistoryEntry) =>
  mutate(storageKey(userId, "history"), isHistory, [], (rows) =>
    [entry, ...rows].slice(0, 50),
  );
export const clearHistory = (userId: string) =>
  mutate(storageKey(userId, "history"), isHistory, [], () => []);
export const loadQueue = (userId: string) =>
  read(storageKey(userId, "progress"), isQueue, []);
export const enqueueProgress = (userId: string, update: ProgressUpdate) =>
  mutate(storageKey(userId, "progress"), isQueue, [], (rows) => {
    const old = rows.find(
      (r) =>
        r.lessonId === update.lessonId &&
        r.enrollmentId === update.enrollmentId,
    );
    // Preserve baseVersion of the first unsynced update; changes are compared to that server snapshot.
    return [
      ...rows.filter((r) => r !== old),
      { ...update, baseVersion: old?.baseVersion ?? update.baseVersion },
    ];
  });
export const acknowledgeProgress = (userId: string, sent: ProgressUpdate[]) =>
  mutate(storageKey(userId, "progress"), isQueue, [], (rows) =>
    rows.filter(
      (row) =>
        !sent.some(
          (s) =>
            s.enrollmentId === row.enrollmentId &&
            s.lessonId === row.lessonId &&
            s.updatedAt === row.updatedAt,
        ),
    ),
  );
