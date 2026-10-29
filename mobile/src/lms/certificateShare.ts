import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import type { Certificate } from "./types";
export function certificateLink(certificate: Certificate) {
  const base = process.env.EXPO_PUBLIC_APP_URL;
  return base
    ? `${base.replace(/\/$/, "")}/learner/certificates/${certificate.id}`
    : `thinkzai://learner/certificates/${certificate.id}`;
}
export async function copyCertificateLink(certificate: Certificate) {
  await Clipboard.setStringAsync(certificateLink(certificate));
}
export async function shareCertificateLink(certificate: Certificate) {
  return Share.share({
    title: "Course certificate",
    message: `${certificate.courseName}: ${certificateLink(certificate)}`,
  });
}
export async function shareCertificatePdf(certificate: Certificate) {
  if (Platform.OS === "web") {
    const link = document.createElement("a");
    link.href = certificate.pdfUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    return;
  }
  if (!FileSystem.cacheDirectory)
    throw new Error("Device file storage is unavailable.");
  const target = `${FileSystem.cacheDirectory}certificate-${certificate.id}.pdf`;
  const result = await FileSystem.downloadAsync(certificate.pdfUrl, target);
  if (result.status !== 200)
    throw new Error(
      "Download link expired. Refresh the certificate and retry.",
    );
  if (Platform.OS === "ios") {
    return Share.share(
      { url: target, title: "Course certificate" },
      { subject: `${certificate.courseName} certificate` },
    );
  }
  // Android core Share supports text only; Expo Sharing supplies a content URI.
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is not available on this device.");
  await Sharing.shareAsync(target, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Save or share certificate",
  });
}
export async function shareCertificatePng(uri: string) {
  if (Platform.OS === "web")
    throw new Error("PNG sharing is available in the Android and iOS app.");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Image sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Share certificate preview",
  });
}
