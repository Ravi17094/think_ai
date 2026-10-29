import { resolveCertificateDownload } from "@/lms/api";
jest.mock("@/api/http", () => ({ API_BASE_URL: "http://laptop.test:5016/api" }));
const certificate = { id: 1, certificateNo: "CERT-1", studentName: "Learner", courseName: "Course", issuedAt: "2026-10-27", pdfUrl: "" };
test("local signed PDF URLs resolve against the configured API host for native downloads", () => {
  const result = resolveCertificateDownload({ ...certificate, pdfUrl: "/api/lms/certificates/1/pdf?token=test" });
  expect(result.pdfUrl).toBe("http://laptop.test:5016/api/lms/certificates/1/pdf?token=test");
});
test("signed S3 URLs are preserved byte-for-byte", () => {
  const signed = "https://bucket.invalid/certificate.pdf?signature=original";
  expect(resolveCertificateDownload({ ...certificate, pdfUrl: signed }).pdfUrl).toBe(signed);
});
test("same-origin browser preview resolves local downloads through the phone's current LAN origin", () => {
  const transport = jest.requireMock("@/api/http");
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  transport.API_BASE_URL = "/api";
  Object.defineProperty(globalThis, "location", { configurable: true, value: { origin: "http://192.168.1.19:8086" } });
  try {
    expect(resolveCertificateDownload({ ...certificate, pdfUrl: "/api/lms/certificates/1/pdf?token=test" }).pdfUrl)
      .toBe("http://192.168.1.19:8086/api/lms/certificates/1/pdf?token=test");
  } finally {
    transport.API_BASE_URL = "http://laptop.test:5016/api";
    if (descriptor) Object.defineProperty(globalThis, "location", descriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});
