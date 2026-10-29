import { NativeModules, Platform } from "react-native";
import type * as RNFS from "react-native-fs";

function fs(): typeof RNFS {
  if (!NativeModules.RNFSManager)
    throw new Error(
      "Offline video downloads require a development build with react-native-fs. Build the Android or iOS app first.",
    );
  return require("react-native-fs");
}
const path = (uri: string) => uri.replace(/^file:\/\//, "");
export const documentDirectory = NativeModules.RNFSManager
  ? `file://${fs().DocumentDirectoryPath}/`
  : null;
export const FileSystemSessionType = { BACKGROUND: 0 };
export async function getFreeDiskStorageAsync() {
  return (await fs().getFSInfo()).freeSpace;
}
export async function makeDirectoryAsync(uri: string, _options?: unknown) {
  await fs().mkdir(path(uri), { NSURLIsExcludedFromBackupKey: true });
}
export async function deleteAsync(uri: string, _options?: unknown) {
  if (await fs().exists(path(uri))) await fs().unlink(path(uri));
}
export async function moveAsync(options: { from: string; to: string }) {
  await fs().moveFile(path(options.from), path(options.to));
}
export async function getInfoAsync(uri: string) {
  if (!(await fs().exists(path(uri)))) return { exists: false, size: 0 };
  return { exists: true, size: Number((await fs().stat(path(uri))).size) };
}
export function createDownloadResumable(
  url: string,
  uri: string,
  _options: unknown,
  progress: (event: {
    totalBytesExpectedToWrite: number;
    totalBytesWritten: number;
  }) => void,
) {
  const background = Platform.OS === "ios";
  let native: typeof RNFS | undefined;
  let jobId: number | undefined;
  let completion: Promise<void> | undefined;
  return {
    async downloadAsync() {
      native = fs();
      const task = native.downloadFile({
        fromUrl: url,
        toFile: path(uri),
        background,
        cacheable: false,
        progressInterval: 250,
        connectionTimeout: 30000,
        readTimeout: 30000,
        begin: () => undefined,
        progress: (event) =>
          progress({
            totalBytesExpectedToWrite: event.contentLength,
            totalBytesWritten: event.bytesWritten,
          }),
      });
      jobId = task.jobId;
      const result = await task.promise;
      return { status: result.statusCode, uri };
    },
    async completeAsync() {
      if (!background || !native || jobId === undefined) return;
      // The caller owns verification, rename and storage cleanup. Keep iOS's
      // background execution time until those operations have all settled.
      if (!completion) {
        const manager = native;
        const completedJob = jobId;
        completion = Promise.resolve().then(() =>
          manager.completeHandlerIOS(completedJob),
        );
      }
      await completion;
    },
  };
}
