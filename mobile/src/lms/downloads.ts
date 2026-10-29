import * as FileSystem from "./downloadFileSystem";
import { mutate, read, storageKey } from "./storage";
import type { Download, Lesson } from "./types";
const isDownloads = (v: unknown): v is Download[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      x &&
      Number.isInteger(x.lessonId) &&
      Number.isInteger(x.courseId) &&
      typeof x.uri === "string" &&
      ["complete", "downloading"].includes(x.status) &&
      typeof x.bytes === "number",
  );
const key = (userId: string) => storageKey(userId, "downloads");
const active = new Set<string>();
const root = (userId: string) => {
  if (!FileSystem.documentDirectory)
    throw new Error("Video downloads require the Android or iOS app.");
  return `${FileSystem.documentDirectory}lms-${encodeURIComponent(userId)}/`;
};
export const listDownloads = (userId: string) =>
  read(key(userId), isDownloads, []);
export async function recoverDownloads(userId: string) {
  const rows = await listDownloads(userId);
  const invalid = new Map<number, Download>();
  for (const row of rows) {
    const taskKey = `${userId}:${row.lessonId}`;
    if (active.has(taskKey)) continue;
    const exists = (await FileSystem.getInfoAsync(row.uri)).exists;
    if (row.status === "complete" && exists) continue;
    // A new download may have started while the native filesystem was read.
    if (active.has(taskKey)) continue;
    await FileSystem.deleteAsync(row.uri, { idempotent: true });
    invalid.set(row.lessonId, row);
  }
  return mutate(key(userId), isDownloads, [], (current) =>
    current.filter((row) => {
      const reviewed = invalid.get(row.lessonId);
      // Remove only the unchanged record we actually inspected. New downloads
      // and completed/replaced records must survive a concurrent recovery.
      return !reviewed ||
        reviewed.courseId !== row.courseId ||
        reviewed.uri !== row.uri ||
        reviewed.status !== row.status ||
        reviewed.timestamp !== row.timestamp ||
        reviewed.bytes !== row.bytes;
    }),
  );
}
export async function downloadLesson(
  userId: string,
  courseId: number,
  lesson: Lesson,
  onProgress: (value: number) => void,
) {
  if (!lesson.videoUrl) throw new Error("This lesson has no video.");
  const taskKey = `${userId}:${lesson.id}`;
  if (active.has(taskKey)) throw new Error("Download already in progress.");
  const uri = `${root(userId)}lesson-${lesson.id}.mp4`;
  const partial = `${uri}.part`;
  active.add(taskKey);
  let download: (ReturnType<typeof FileSystem.createDownloadResumable> & {
    completeAsync?: () => Promise<void>;
  }) | undefined;
  try {
    const existing = await listDownloads(userId);
    if (
      existing.some(
        (r) => r.lessonId === lesson.id && r.status === "complete",
      ) &&
      (await FileSystem.getInfoAsync(uri)).exists
    )
      return;
    const bytes = lesson.videoBytes;
    if (!bytes)
      throw new Error(
        "Ask staff to configure this video size before downloading.",
      );
    const free = await FileSystem.getFreeDiskStorageAsync();
    await FileSystem.makeDirectoryAsync(root(userId), { intermediates: true });
    const record: Download = {
      lessonId: lesson.id,
      title: lesson.title,
      courseId,
      uri: partial,
      bytes,
      status: "downloading",
      timestamp: new Date().toISOString(),
    };
    // Reserve quota inside the serialized storage update so simultaneous
    // downloads cannot both claim the same remaining space.
    await mutate(key(userId), isDownloads, [], (rows) => {
      const remaining = rows.filter((r) => r.lessonId !== lesson.id);
      const reserved = remaining
        .filter((r) => r.status === "downloading")
        .reduce((n, r) => n + r.bytes, 0);
      if (
        free < bytes + reserved + 100 * 1024 * 1024 ||
        remaining.reduce((n, r) => n + r.bytes, 0) + bytes > 1024 * 1024 * 1024
      )
        throw new Error(
          "Storage quota reached. Delete downloads or free space first.",
        );
      return [...remaining, record];
    });
    download = FileSystem.createDownloadResumable(
      lesson.videoUrl,
      partial,
      { sessionType: FileSystem.FileSystemSessionType.BACKGROUND },
      (event) =>
        onProgress(
          event.totalBytesExpectedToWrite > 0
            ? event.totalBytesWritten / event.totalBytesExpectedToWrite
            : 0,
        ),
    );
    const result = await download.downloadAsync();
    if (!result || result.status !== 200)
      throw new Error("Download failed. Please retry.");
    const info = await FileSystem.getInfoAsync(partial);
    if (!info.exists || info.size !== bytes)
      throw new Error(
        "Incomplete video: downloaded size does not match the content manifest.",
      );
    await FileSystem.moveAsync({ from: partial, to: uri });
    await mutate(key(userId), isDownloads, [], (rows) =>
      rows.map((r) =>
        r.lessonId === lesson.id
          ? { ...r, uri, status: "complete" as const }
          : r,
      ),
    );
    onProgress(1);
  } catch (error) {
    await FileSystem.deleteAsync(partial, { idempotent: true });
    await mutate(key(userId), isDownloads, [], (rows) =>
      rows.filter((r) => r.lessonId !== lesson.id),
    );
    throw error;
  } finally {
    try {
      await download?.completeAsync?.();
    } catch {
      // Releasing iOS background execution cannot change the verified file or
      // replace the original download/cleanup error.
    } finally {
      active.delete(taskKey);
    }
  }
}
export async function localVideo(userId: string, lesson: Lesson) {
  const rows = await listDownloads(userId);
  const row = rows.find(
    (r) => r.lessonId === lesson.id && r.status === "complete",
  );
  return row && (await FileSystem.getInfoAsync(row.uri)).exists
    ? row.uri
    : lesson.videoUrl;
}
export async function deleteDownload(userId: string, lessonId: number) {
  if (active.has(`${userId}:${lessonId}`))
    throw new Error("Wait for this download to finish.");
  const row = (await listDownloads(userId)).find(
    (r) => r.lessonId === lessonId,
  );
  if (row) await FileSystem.deleteAsync(row.uri, { idempotent: true });
  return mutate(key(userId), isDownloads, [], (rows) =>
    rows.filter((r) => r.lessonId !== lessonId),
  );
}
