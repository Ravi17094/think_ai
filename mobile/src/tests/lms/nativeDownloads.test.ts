import { NativeModules, Platform } from "react-native";
import RNFS from "react-native-fs";
import * as Files from "@/lms/downloadFileSystem.native";

jest.mock("react-native", () => ({
  NativeModules: { RNFSManager: {} },
  Platform: { OS: "android" },
}));
jest.mock("react-native-fs", () => ({
  DocumentDirectoryPath: "/documents",
  getFSInfo: jest.fn(),
  exists: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  moveFile: jest.fn(),
  downloadFile: jest.fn(),
  completeHandlerIOS: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, "OS", {
    value: "android",
    configurable: true,
  });
  NativeModules.RNFSManager = {};
  (RNFS.exists as jest.Mock).mockResolvedValue(true);
  (RNFS.stat as jest.Mock).mockResolvedValue({ size: 1024 });
  (RNFS.downloadFile as jest.Mock).mockImplementation((options) => {
    options.begin({ statusCode: 200 });
    options.progress({ contentLength: 1024, bytesWritten: 1024 });
    return { jobId: 7, promise: Promise.resolve({ statusCode: 200 }) };
  });
});
test("native video download uses RNFS and returns a playable file URI", async () => {
  const progress = jest.fn();
  const download = Files.createDownloadResumable(
    "https://example.invalid/a.mp4",
    "file:///documents/a.part",
    {},
    progress,
  );
  await expect(download.downloadAsync()).resolves.toEqual({
    status: 200,
    uri: "file:///documents/a.part",
  });
  expect(RNFS.downloadFile).toHaveBeenCalledWith(
    expect.objectContaining({ toFile: "/documents/a.part", background: false }),
  );
  expect(progress).toHaveBeenCalledWith({
    totalBytesExpectedToWrite: 1024,
    totalBytesWritten: 1024,
  });
  expect(await Files.getInfoAsync("file:///documents/a.part")).toEqual({
    exists: true,
    size: 1024,
  });
});
test("iOS background completion is deferred until the caller finishes and is released once", async () => {
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  const download = Files.createDownloadResumable(
    "https://example.invalid/a.mp4",
    "file:///documents/a.part",
    {},
    jest.fn(),
  );
  await download.downloadAsync();
  expect(RNFS.completeHandlerIOS).not.toHaveBeenCalled();
  await Promise.all([download.completeAsync(), download.completeAsync()]);
  expect(RNFS.completeHandlerIOS).toHaveBeenCalledTimes(1);
  expect(RNFS.completeHandlerIOS).toHaveBeenCalledWith(7);
});

test("failed iOS downloads retain background execution until cleanup finishes", async () => {
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  (RNFS.downloadFile as jest.Mock).mockReturnValue({
    jobId: 8,
    promise: Promise.reject(new Error("Network lost")),
  });
  const download = Files.createDownloadResumable(
    "https://example.invalid/a.mp4",
    "file:///documents/a.part",
    {},
    jest.fn(),
  );
  await expect(download.downloadAsync()).rejects.toThrow("Network lost");
  expect(RNFS.completeHandlerIOS).not.toHaveBeenCalled();
  await download.completeAsync();
  await download.completeAsync();
  expect(RNFS.completeHandlerIOS).toHaveBeenCalledTimes(1);
  expect(RNFS.completeHandlerIOS).toHaveBeenCalledWith(8);
});

test("Android downloads do not invoke the iOS completion API", async () => {
  const download = Files.createDownloadResumable(
    "https://example.invalid/a.mp4",
    "file:///documents/a.part",
    {},
    jest.fn(),
  );
  await download.downloadAsync();
  await download.completeAsync();
  expect(RNFS.completeHandlerIOS).not.toHaveBeenCalled();
});
test("missing native module gives an actionable development-build error", async () => {
  delete NativeModules.RNFSManager;
  await expect(Files.getFreeDiskStorageAsync()).rejects.toThrow(
    "development build",
  );
});
test("cleanup is idempotent when the partial file is already missing", async () => {
  (RNFS.exists as jest.Mock).mockResolvedValue(false);
  await Files.deleteAsync("file:///documents/a.part", { idempotent: true });
  expect(RNFS.unlink).not.toHaveBeenCalled();
});
