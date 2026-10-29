import { API_BASE_URL } from "@/api/http";
import { getSession, restoreSession, signIn } from "@/api/session";
import type {
  Analytics,
  Answer,
  AssessmentResult,
  Attempt,
  Certificate,
  Enrollment,
  Execution,
  Language,
  PlayerData,
  Profile,
  Progress,
  ProgressUpdate,
  ReportStatus,
} from "./types";
export class LmsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    timeout?: number;
    token?: string;
  } = {},
): Promise<T> {
  await restoreSession();
  const token = options.token ?? getSession().token;
  if (!token)
    throw new LmsApiError(
      "Sign in to open your learning workspace.",
      401,
      "AUTH_REQUIRED",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 15000);
  try {
    const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}${path}`, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const payload = await response.json();
    if (!response.ok || payload.success === false)
      throw new LmsApiError(
        payload.message || payload.error || "Request failed.",
        response.status,
        payload.code || "REQUEST_FAILED",
      );
    return payload.data as T;
  } catch (error) {
    if (error instanceof LmsApiError) throw error;
    if (controller.signal.aborted)
      throw new LmsApiError(
        "The request timed out. Please try again.",
        0,
        "REQUEST_TIMEOUT",
      );
    throw new LmsApiError(
      "Connection failed or timed out. Check your internet and API URL.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}
export async function login(email: string, password: string) {
  const response = await fetch(
    `${API_BASE_URL.replace(/\/$/, "")}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  const payload = await response.json();
  if (!response.ok || !payload.token)
    throw new Error(payload.message || payload.error || "Sign-in failed.");
  await signIn(String(payload.user.id), payload.token);
}
export function resolveCertificateDownload(certificate: Certificate): Certificate {
  if (!certificate.pdfUrl.startsWith("/api/lms/certificates/")) return certificate;
  const origin = /^https?:\/\//.test(API_BASE_URL)
    ? API_BASE_URL
    : typeof globalThis.location !== "undefined" ? globalThis.location.origin : null;
  if (!origin) throw new LmsApiError("Configure an absolute API URL for certificate downloads.", 0, "API_URL_REQUIRED");
  return { ...certificate, pdfUrl: new URL(certificate.pdfUrl, origin).toString() };
}
export const lmsApi = {
  enrollments: () => request<Enrollment[]>("/lms/enrollments"),
  player: (courseId: number) =>
    request<PlayerData>(`/lms/courses/${courseId}/player`),
  profile: (token?: string) => request<Profile>("/lms/me", { token }),
  updateName: (name: string) =>
    request("/lms/me", { method: "PATCH", body: { name } }),
  note: (enrollmentId: number, lessonId: number) =>
    request<{ text: string }>(
      `/lms/enrollments/${enrollmentId}/lessons/${lessonId}/notes`,
    ),
  saveNote: (enrollmentId: number, lessonId: number, text: string) =>
    request(`/lms/enrollments/${enrollmentId}/lessons/${lessonId}/notes`, {
      method: "PUT",
      body: { text },
    }),
  start: (id: number, enrollmentId: number) =>
    request<Attempt>(`/lms/assessments/${id}/start`, {
      method: "POST",
      body: { enrollmentId },
    }),
  submit: (
    id: number,
    attemptId: number,
    answers: Answer[],
    flaggedQuestionIds: number[],
  ) =>
    request<{ attemptId: number; status: string }>(
      `/lms/assessments/${id}/submit`,
      {
        method: "POST",
        body: {
          attemptId,
          answers,
          flaggedQuestionIds,
          timestamp: new Date().toISOString(),
        },
      },
    ),
  result: (attemptId: number) =>
    request<AssessmentResult>(`/lms/attempts/${attemptId}/results`),
  certificate: (id: number) => request<Certificate>(`/lms/certificates/${id}`).then(resolveCertificateDownload),
  generate: (enrollmentId: number) =>
    request<Certificate>("/lms/certificates/generate", {
      method: "POST",
      body: { enrollmentId },
      timeout: 30000,
    }),
  execute: (
    language: Language,
    sourceCode: string,
    input: string,
    expectedOutput?: string,
    token?: string,
  ) =>
    request<Execution>("/lms/code/execute", {
      method: "POST",
      timeout: 35000,
      token,
      body: {
        language,
        sourceCode,
        testCases: [
          {
            input,
            ...(expectedOutput === undefined ? {} : { expectedOutput }),
          },
        ],
        timeout: 30,
      },
    }),
  sync: (updates: ProgressUpdate[], token: string) =>
    request<
      {
        lessonId: number;
        enrollmentId: number;
        conflict: boolean;
        progress: Progress | null;
      }[]
    >("/lms/progress/sync", { method: "POST", body: { updates }, token }),
  reportStatus: () => request<ReportStatus>("/lms/analytics/report-status"),
  analytics: (from: string, to: string, bucket: string) =>
    request<Analytics>(
      `/lms/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&bucket=${bucket}`,
    ),
};
