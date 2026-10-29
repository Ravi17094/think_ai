import { Platform, Share } from "react-native";
import * as FS from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import {
  copyCertificateLink,
  shareCertificateLink,
  shareCertificatePdf,
  shareCertificatePng,
} from "@/lms/certificateShare";
jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  downloadAsync: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
const cert = {
  id: 1,
  certificateNo: "CERT-1",
  studentName: "Patan",
  courseName: "RN",
  issuedAt: new Date().toISOString(),
  pdfUrl: "https://files.invalid/1.pdf",
};
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, "OS", {
    value: "android",
    configurable: true,
  });
  (FS.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
});
test("PDF sharing downloads file before invoking native file share", async () => {
  await shareCertificatePdf(cert);
  expect(FS.downloadAsync).toHaveBeenCalledWith(
    cert.pdfUrl,
    "file:///cache/certificate-1.pdf",
  );
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    "file:///cache/certificate-1.pdf",
    expect.objectContaining({ mimeType: "application/pdf" }),
  );
});
test("link copy uses stable app link rather than expiring S3 URL", async () => {
  await copyCertificateLink(cert);
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
    expect.stringContaining("/learner/certificates/1"),
  );
});
test("React Native Share cancellation resolves normally", async () => {
  jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: Share.dismissedAction });
  await expect(shareCertificateLink(cert)).resolves.toEqual({
    action: Share.dismissedAction,
  });
});
test("PNG preview uses image share type", async () => {
  await shareCertificatePng("file:///preview.png");
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    "file:///preview.png",
    expect.objectContaining({ mimeType: "image/png" }),
  );
});
test("expired download returns an actionable error", async () => {
  (FS.downloadAsync as jest.Mock).mockResolvedValue({ status: 403 });
  await expect(shareCertificatePdf(cert)).rejects.toThrow("expired");
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test("iOS PDF sharing uses React Native Share and preserves cancellation", async () => {
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: Share.dismissedAction });
  await expect(shareCertificatePdf(cert)).resolves.toEqual({
    action: Share.dismissedAction,
  });
  expect(Share.share).toHaveBeenCalledWith(
    { url: "file:///cache/certificate-1.pdf", title: "Course certificate" },
    { subject: "RN certificate" },
  );
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
