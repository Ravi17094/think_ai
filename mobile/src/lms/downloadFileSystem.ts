// Expo/web fallback. Native builds resolve downloadFileSystem.native.ts.
export {
  documentDirectory,
  FileSystemSessionType,
  getFreeDiskStorageAsync,
  makeDirectoryAsync,
  deleteAsync,
  moveAsync,
  getInfoAsync,
  createDownloadResumable,
} from "expo-file-system";
