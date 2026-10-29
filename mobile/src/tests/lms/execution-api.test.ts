import { lmsApi, LmsApiError } from "@/lms/api";
import { restoreSession } from "@/api/session";
import type { Language } from "@/lms/types";
let mockSession = { userId: "7", token: "current-token", isSignedIn: true };
jest.mock("@/api/session", () => ({
  getSession: () => mockSession,
  restoreSession: jest.fn(async () => mockSession),
  signIn: jest.fn(),
}));
jest.mock("@/api/http", () => ({ API_BASE_URL: "https://api.example.invalid/api" }));
const response = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockSession = { userId: "7", token: "current-token", isSignedIn: true };
  global.fetch = jest.fn().mockResolvedValue(response({ success: true, data: { language: "python", results: [] } }));
});

test.each<Language>(["python", "javascript", "java", "cpp"])("%s execution uses the authenticated LMS endpoint and exact stdin/expected payload", async (language) => {
  await lmsApi.execute(language, "source", "line one\nline two", "output", "captured-token");
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = (fetch as jest.Mock).mock.calls[0];
  expect(url).toBe("https://api.example.invalid/api/lms/code/execute");
  expect(options.headers.Authorization).toBe("Bearer captured-token");
  expect(JSON.parse(options.body)).toEqual({ language, sourceCode: "source", testCases: [{ input: "line one\nline two", expectedOutput: "output" }], timeout: 30 });
});

test("optional expected output is omitted rather than forcing a match against blank output", async () => {
  await lmsApi.execute("python", "print(1)", "");
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body).testCases).toEqual([{ input: "" }]);
});

test("session restoration/account changes cannot replace an explicitly captured execution token", async () => {
  let resume!: (value: typeof mockSession) => void;
  (restoreSession as jest.Mock).mockReturnValueOnce(new Promise((resolve) => { resume = resolve; }));
  const running = lmsApi.execute("java", "source", "", undefined, "original-token");
  mockSession = { userId: "8", token: "other-token", isSignedIn: true };
  resume(mockSession);
  await running;
  expect((fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe("Bearer original-token");
});

test("execution HTTP timeout aborts at 35 seconds and returns a retryable timeout error", async () => {
  let signal!: AbortSignal;
  (fetch as jest.Mock).mockImplementation((_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
    });
  });
  const outcome = lmsApi.execute("python", "while True: pass", "").catch((error) => error);
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(34999);
  expect(signal.aborted).toBe(false);
  jest.advanceTimersByTime(1);
  const error = await outcome;
  expect(error).toBeInstanceOf(LmsApiError);
  expect(error).toMatchObject({ status: 0, code: "REQUEST_TIMEOUT" });
  expect(error.message).toContain("timed out");
});

test.each([
  [504, "EXECUTION_TIMEOUT", "Execution exceeded the time limit."],
  [503, "EXECUTOR_UNAVAILABLE", "Code service unavailable."],
  [429, "EXECUTOR_BUSY", "Code service is busy."],
])("preserves sandbox/API %i error status and code", async (status, code, message) => {
  (fetch as jest.Mock).mockResolvedValue(response({ success: false, code, message }, status as number));
  await expect(lmsApi.execute("python", "print(1)", "")).rejects.toMatchObject({ status, code, message });
});

test("signed-out execution never sends a network request", async () => {
  mockSession = { userId: "7", token: "", isSignedIn: false };
  await expect(lmsApi.execute("python", "print(1)", "")).rejects.toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
  expect(fetch).not.toHaveBeenCalled();
});
