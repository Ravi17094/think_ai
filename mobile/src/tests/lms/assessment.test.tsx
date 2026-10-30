import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lmsApi } from "@/lms/api";
import { loadDraft, saveDraft } from "@/lms/storage";
import { remainingSeconds, useAssessment } from "@/lms/useAssessment";
jest.mock("@/lms/LmsProvider", () => ({
  useLms: () => ({
    session: { userId: "patan", token: "test-token" },
    online: true,
  }),
}));
jest.mock("@/lms/api", () => ({
  lmsApi: { start: jest.fn(), submit: jest.fn() },
  LmsApiError: class extends Error {
    status = 0;
  },
}));
const clock = new Date("2026-10-22T10:00:00Z").getTime();
const makeAttempt = () => ({
  attemptId: 4,
  startedAt: new Date(clock).toISOString(),
  serverTime: new Date(clock).toISOString(),
  expiresAt: new Date(clock + 600000).toISOString(),
  assessment: {
    id: 1,
    title: "Quiz",
    questions: [
      {
        id: 1,
        questionText: "Q",
        questionType: "MCQ",
        marks: 1,
        options: [{ id: 1, optionText: "A" }],
      },
    ],
  },
});
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.setSystemTime(clock);
  (lmsApi.start as jest.Mock).mockResolvedValue(makeAttempt());
  (lmsApi.submit as jest.Mock).mockResolvedValue({
    attemptId: 4,
    status: "GRADING",
  });
});
test("timer uses absolute expiry and does not lose time when JS was suspended", () => {
  const expires = new Date(clock + 600000).toISOString();
  expect(remainingSeconds(expires, clock)).toBe(600);
  expect(remainingSeconds(expires, clock + 123456)).toBe(477);
  expect(remainingSeconds(expires, clock + 700000)).toBe(0);
});
test("answers and flags auto-save every 30 seconds", async () => {
  const hook = renderHook(() => useAssessment(1, 2, jest.fn()));
  await waitFor(() => expect(hook.result.current.attempt).not.toBeNull());
  act(() => {
    hook.result.current.answer({ questionId: 1, selectedOptionId: 1 });
    hook.result.current.toggleFlag(1);
  });
  await act(async () => {
    jest.advanceTimersByTime(30000);
    await Promise.resolve();
  });
  await waitFor(async () =>
    expect((await loadDraft("patan", 1))?.flags).toEqual([1]),
  );
  expect((await loadDraft("patan", 1))?.answers["1"]?.selectedOptionId).toBe(1);
  hook.unmount();
});
test("resume prompt restores saved answers and flags", async () => {
  await saveDraft("patan", 1, {
    attemptId: 4,
    expiresAt: makeAttempt().expiresAt,
    answers: { 1: { questionId: 1, selectedOptionId: 1 } },
    flags: [1],
    savedAt: new Date(clock).toISOString(),
  });
  const hook = renderHook(() => useAssessment(1, 2, jest.fn()));
  await waitFor(() => expect(hook.result.current.pendingDraft).not.toBeNull());
  expect(lmsApi.start).not.toHaveBeenCalled();
  await act(async () => {
    await hook.result.current.resume();
  });
  expect(hook.result.current.flags).toEqual([1]);
  expect(hook.result.current.answers["1"]?.selectedOptionId).toBe(1);
  hook.unmount();
});
test("successful submit clears draft; cleanup does not resurrect it", async () => {
  const submitted = jest.fn();
  const hook = renderHook(() => useAssessment(1, 2, submitted));
  await waitFor(() => expect(hook.result.current.attempt).not.toBeNull());
  act(() => hook.result.current.answer({ questionId: 1, selectedOptionId: 1 }));
  await act(async () => {
    await hook.result.current.submit();
  });
  hook.unmount();
  expect(submitted).toHaveBeenCalledWith(4);
  expect(await loadDraft("patan", 1)).toBeNull();
});
test("failed submit preserves recoverable draft", async () => {
  (lmsApi.submit as jest.Mock).mockRejectedValue(new Error("Offline"));
  const hook = renderHook(() => useAssessment(1, 2, jest.fn()));
  await waitFor(() => expect(hook.result.current.attempt).not.toBeNull());
  act(() => hook.result.current.answer({ questionId: 1, selectedOptionId: 1 }));
  await act(async () => {
    await hook.result.current.submit();
  });
  expect(hook.result.current.error).toBe("Offline");
  expect((await loadDraft("patan", 1))?.answers["1"]?.selectedOptionId).toBe(1);
  hook.unmount();
});

test("Retry retains answers and flags and resubmits the same attempt", async () => {
  (lmsApi.submit as jest.Mock).mockRejectedValueOnce(new Error("Offline"));
  const submitted = jest.fn();
  const hook = renderHook(() => useAssessment(1, 2, submitted));
  await waitFor(() => expect(hook.result.current.attempt).not.toBeNull());
  act(() => {
    hook.result.current.answer({ questionId: 1, selectedOptionId: 1 });
    hook.result.current.toggleFlag(1);
  });
  await act(async () => { await hook.result.current.submit(); });
  expect(hook.result.current.error).toBe("Offline");
  const expiry = hook.result.current.attempt!.expiresAt;
  await act(async () => { await hook.result.current.retry(); });
  expect(lmsApi.start).toHaveBeenCalledTimes(1);
  expect(lmsApi.submit).toHaveBeenLastCalledWith(1, 4, [{ questionId: 1, selectedOptionId: 1 }], [1]);
  expect(hook.result.current.answers["1"]!.selectedOptionId).toBe(1);
  expect(hook.result.current.flags).toEqual([1]);
  expect(hook.result.current.attempt!.expiresAt).toBe(expiry);
  expect(submitted).toHaveBeenCalledWith(4);
  expect(await loadDraft("patan", 1)).toBeNull();
  hook.unmount();
});

test("initial-load Retry starts the assessment without submitting it", async () => {
  (lmsApi.start as jest.Mock).mockRejectedValueOnce(new Error("Server unavailable"));
  const hook = renderHook(() => useAssessment(1, 2, jest.fn()));
  await waitFor(() => expect(hook.result.current.error).toBe("Server unavailable"));
  await act(async () => { await hook.result.current.retry(); });
  expect(hook.result.current.attempt?.attemptId).toBe(4);
  expect(lmsApi.submit).not.toHaveBeenCalled();
  hook.unmount();
});

test("Retry after an autosave error preserves the active draft without submitting", async () => {
  const hook = renderHook(() => useAssessment(1, 2, jest.fn()));
  await waitFor(() => expect(hook.result.current.attempt).not.toBeNull());
  act(() => hook.result.current.answer({ questionId: 1, selectedOptionId: 1 }));
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Storage unavailable"));
  await act(async () => { await hook.result.current.persist(); });
  expect(hook.result.current.error).toContain("Draft could not be saved");
  await act(async () => { await hook.result.current.retry(); });
  expect(hook.result.current.error).toBeNull();
  expect(lmsApi.submit).not.toHaveBeenCalled();
  expect((await loadDraft("patan", 1))?.answers["1"]!.selectedOptionId).toBe(1);
  hook.unmount();
});
