import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FS from "@/lms/downloadFileSystem";
import {
  deleteDownload,
  downloadLesson,
  listDownloads,
  localVideo,
  recoverDownloads,
} from "@/lms/downloads";
import type { Lesson } from "@/lms/types";
import { storageKey } from "@/lms/storage";
jest.mock("@/lms/downloadFileSystem", () => ({
  documentDirectory: "file:///documents/",
  FileSystemSessionType: { BACKGROUND: 0 },
  getFreeDiskStorageAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
}));
const lesson: Lesson = {
  id: 1,
  title: "Video",
  videoUrl: "https://video.invalid/a.mp4",
  durationSeconds: 100,
  completionThreshold: 90,
  videoBytes: 1000,
  order: 0,
};
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (FS.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(2 * 1024 ** 3);
  (FS.getInfoAsync as jest.Mock).mockResolvedValue({
    exists: true,
    size: 1000,
  });
  (FS.createDownloadResumable as jest.Mock).mockImplementation(
    (_url, _path, _options, progress) => ({
      downloadAsync: async () => {
        progress({ totalBytesWritten: 1000, totalBytesExpectedToWrite: 1000 });
        return { status: 200 };
      },
    }),
  );
});
test("download tracks progress, verifies size, prefers local video and deletes files", async () => {
  const progress = jest.fn();
  await downloadLesson("patan", 2, lesson, progress);
  expect(progress).toHaveBeenCalledWith(1);
  expect((await listDownloads("patan"))[0]?.status).toBe("complete");
  expect(await localVideo("patan", lesson)).toContain("file:///documents/");
  await deleteDownload("patan", 1);
  expect(await listDownloads("patan")).toEqual([]);
  expect(FS.deleteAsync).toHaveBeenCalled();
});
test("quota prevents network download before allocating files", async () => {
  (FS.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(1000);
  await expect(downloadLesson("patan", 2, lesson, jest.fn())).rejects.toThrow(
    "quota",
  );
  expect(FS.createDownloadResumable).not.toHaveBeenCalled();
});
test("partial file is removed after download failure", async () => {
  (FS.createDownloadResumable as jest.Mock).mockReturnValue({
    downloadAsync: async () => {
      throw new Error("Disconnected");
    },
  });
  await expect(downloadLesson("patan", 2, lesson, jest.fn())).rejects.toThrow(
    "Disconnected",
  );
  expect(await listDownloads("patan")).toEqual([]);
  expect(FS.deleteAsync).toHaveBeenCalledWith(
    expect.stringContaining(".part"),
    { idempotent: true },
  );
});
test("mismatching downloaded byte count never becomes playable offline", async () => {
  (FS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 500 });
  await expect(downloadLesson("patan", 2, lesson, jest.fn())).rejects.toThrow(
    "Incomplete video",
  );
  expect(await listDownloads("patan")).toEqual([]);
});
test("recovery removes missing downloads and streaming is the fallback", async () => {
  await downloadLesson("patan", 2, lesson, jest.fn());
  (FS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
  expect(await localVideo("patan", lesson)).toBe(lesson.videoUrl);
  expect(await recoverDownloads("patan")).toEqual([]);
});

test("simultaneous downloads reserve quota before either network request completes", async () => {
  const bytes = 600 * 1024 ** 2;
  (FS.getInfoAsync as jest.Mock).mockResolvedValue({
    exists: true,
    size: bytes,
  });
  const result = await Promise.allSettled([
    downloadLesson(
      "patan",
      2,
      { ...lesson, id: 10, videoBytes: bytes },
      jest.fn(),
    ),
    downloadLesson(
      "patan",
      2,
      { ...lesson, id: 11, videoBytes: bytes },
      jest.fn(),
    ),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(result.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(FS.createDownloadResumable).toHaveBeenCalledTimes(1);
  expect(await listDownloads("patan")).toHaveLength(1);
});

test("background execution is released only after the verified file and complete record are committed", async () => {
  let recordsAtRelease: unknown;
  const phases: string[] = [];
  (FS.moveAsync as jest.Mock).mockImplementationOnce(async () => { phases.push("move"); });
  const completeAsync = jest.fn(async () => {
    recordsAtRelease = await listDownloads("patan");
    phases.push("release");
  });
  (FS.createDownloadResumable as jest.Mock).mockReturnValue({
    downloadAsync: async () => ({ status: 200 }),
    completeAsync,
  });
  await downloadLesson("patan", 2, lesson, jest.fn());
  expect(completeAsync).toHaveBeenCalledTimes(1);
  expect(phases).toEqual(["move", "release"]);
  expect(recordsAtRelease).toEqual([
    expect.objectContaining({
      lessonId: 1,
      status: "complete",
      uri: "file:///documents/lms-patan/lesson-1.mp4",
    }),
  ]);
});

test("failed downloads release background execution after partial-file and record cleanup", async () => {
  let recordsAtRelease: unknown;
  const phases: string[] = [];
  (FS.deleteAsync as jest.Mock).mockImplementationOnce(async () => { phases.push("delete"); });
  const completeAsync = jest.fn(async () => {
    recordsAtRelease = await listDownloads("patan");
    phases.push("release");
  });
  (FS.createDownloadResumable as jest.Mock).mockReturnValue({
    downloadAsync: async () => { throw new Error("Network lost"); },
    completeAsync,
  });
  await expect(downloadLesson("patan", 2, lesson, jest.fn())).rejects.toThrow("Network lost");
  expect(completeAsync).toHaveBeenCalledTimes(1);
  expect(phases).toEqual(["delete", "release"]);
  expect(recordsAtRelease).toEqual([]);
});

test("completion acknowledgement failure cannot replace the original download error", async () => {
  const completeAsync = jest.fn().mockRejectedValue(new Error("Completion unavailable"));
  (FS.createDownloadResumable as jest.Mock).mockReturnValue({
    downloadAsync: async () => { throw new Error("Network lost"); },
    completeAsync,
  });
  await expect(downloadLesson("patan", 2, lesson, jest.fn())).rejects.toThrow("Network lost");
  expect(completeAsync).toHaveBeenCalledTimes(1);
  expect(await listDownloads("patan")).toEqual([]);
});

test.each(["partial file", "stored record"])(
  "background execution is released even when %s cleanup fails",
  async (cleanup) => {
    const completeAsync = jest.fn().mockResolvedValue(undefined);
    if (cleanup === "partial file")
      (FS.deleteAsync as jest.Mock).mockRejectedValueOnce(new Error("Cleanup failed"));
    (FS.createDownloadResumable as jest.Mock).mockReturnValue({
      downloadAsync: async () => {
        if (cleanup === "stored record")
          (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Cleanup failed"));
        throw new Error("Network lost");
      },
      completeAsync,
    });
    await expect(downloadLesson("patan", 2, lesson, jest.fn())).rejects.toThrow("Cleanup failed");
    expect(completeAsync).toHaveBeenCalledTimes(1);
  },
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("recovery preserves a new download reserved after its filesystem snapshot", async () => {
  await downloadLesson("patan", 2, lesson, jest.fn());
  const inspected = deferred<void>();
  const info = deferred<{ exists: boolean; size: number }>();
  const network = deferred<{ status: number }>();
  (FS.getInfoAsync as jest.Mock).mockImplementationOnce(() => {
    inspected.resolve();
    return info.promise;
  });
  const recovery = recoverDownloads("patan");
  await inspected.promise;
  const started = deferred<void>();
  (FS.createDownloadResumable as jest.Mock).mockImplementationOnce(() => {
    started.resolve();
    return { downloadAsync: () => network.promise };
  });
  const downloading = downloadLesson("patan", 2, { ...lesson, id: 2 }, jest.fn());
  await started.promise;
  info.resolve({ exists: true, size: 1000 });
  await recovery;
  const during = await listDownloads("patan");
  network.resolve({ status: 200 });
  await downloading;
  expect(during).toEqual(expect.arrayContaining([
    expect.objectContaining({ lessonId: 2, status: "downloading" }),
  ]));
  expect(await listDownloads("patan")).toEqual(expect.arrayContaining([
    expect.objectContaining({ lessonId: 2, status: "complete" }),
  ]));
});

test("recovery does not replace a completed record with its older downloading snapshot", async () => {
  const network = deferred<{ status: number }>();
  const started = deferred<void>();
  (FS.createDownloadResumable as jest.Mock).mockImplementationOnce(() => {
    started.resolve();
    return { downloadAsync: () => network.promise };
  });
  const downloading = downloadLesson("patan", 2, lesson, jest.fn());
  await started.promise;
  const snapshot = await AsyncStorage.getItem(storageKey("patan", "downloads"));
  const snapshotRead = deferred<string | null>();
  (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => snapshotRead.promise);
  const recovery = recoverDownloads("patan");
  network.resolve({ status: 200 });
  await downloading;
  snapshotRead.resolve(snapshot);
  await recovery;
  expect(await listDownloads("patan")).toEqual([
    expect.objectContaining({ lessonId: 1, status: "complete" }),
  ]);
});
