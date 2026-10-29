import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lmsApi, LmsApiError } from "./api";
import { useLms } from "./LmsProvider";
import { clearDraft, loadDraft, read, saveDraft, storageKey } from "./storage";
import type { Answer, Attempt, Draft } from "./types";
export function remainingSeconds(expiresAt: string, now: number, offset = 0) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now - offset) / 1000));
}
export function useAssessment(
  assessmentId: number,
  enrollmentId: number,
  onSubmitted: (id: number) => void,
) {
  const { session } = useLms();
  const userId = session.userId;
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({}),
    [flags, setFlags] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [submitting, setSubmitting] = useState(false),
    [savedAt, setSavedAt] = useState("");
  const offset = useRef(0),
    snapshot = useRef<Draft | null>(null),
    submitted = useRef(false),
    busy = useRef(false),
    active = useRef(true),
    expirySubmitted = useRef(false);
  const cacheKey = storageKey(userId, `attempt:${assessmentId}`);
  const initialize = useCallback(
    async (resume?: Draft | null) => {
      setLoading(true);
      setError(null);
      submitted.current = false;
      expirySubmitted.current = false;
      try {
        let value: Attempt;
        try {
          value = await lmsApi.start(assessmentId, enrollmentId);
          offset.current = Date.parse(value.serverTime) - Date.now();
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({ value, offset: offset.current }),
          );
        } catch (e) {
          if (!(e instanceof LmsApiError) || e.status !== 0) throw e;
          const cached = await read(
            cacheKey,
            (v): v is { value: Attempt; offset: number } | null =>
              v === null ||
              (!!v &&
                typeof v === "object" &&
                "value" in v &&
                "offset" in v &&
                typeof v.offset === "number" &&
                !!v.value &&
                typeof v.value === "object" &&
                "attemptId" in v.value &&
                "expiresAt" in v.value),
            null,
          );
          if (!cached || !resume || cached.value.attemptId !== resume.attemptId)
            throw e;
          value = cached.value;
          offset.current = cached.offset;
        }
        if (resume && resume.attemptId !== value.attemptId)
          throw new Error(
            "Saved draft belongs to an expired attempt. Discard it to start again.",
          );
        if (!active.current) return;
        setAnswers(resume?.answers || {});
        setFlags(resume?.flags || []);
        setSavedAt(resume?.savedAt || "");
        setSeconds(
          remainingSeconds(value.expiresAt, Date.now(), offset.current),
        );
        setAttempt(value);
        setPendingDraft(null);
      } catch (e) {
        if (active.current)
          setError(
            e instanceof Error ? e.message : "Unable to start assessment.",
          );
      } finally {
        if (active.current) setLoading(false);
      }
    },
    [assessmentId, enrollmentId, cacheKey],
  );
  useEffect(() => {
    active.current = true;
    async function load() {
      try {
        const draft = await loadDraft(userId, assessmentId);
        if (!active.current) return;
        if (draft) {
          setPendingDraft(draft);
          setLoading(false);
        } else await initialize();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Cannot read draft.");
        setLoading(false);
      }
    }
    if (session.token) void load();
    else setLoading(false);
    return () => {
      active.current = false;
    };
  }, [initialize, userId, assessmentId, session.token]);
  useEffect(() => {
    snapshot.current = attempt
      ? {
          attemptId: attempt.attemptId,
          expiresAt: attempt.expiresAt,
          answers,
          flags,
          savedAt: new Date().toISOString(),
        }
      : null;
  }, [attempt, answers, flags]);
  const persist = useCallback(async () => {
    if (!snapshot.current || submitted.current) return;
    const draft = { ...snapshot.current, savedAt: new Date().toISOString() };
    try {
      await saveDraft(userId, assessmentId, draft);
      if (active.current && !submitted.current) setSavedAt(draft.savedAt);
    } catch {
      if (active.current)
        setError("Draft could not be saved. Check device storage.");
    }
  }, [userId, assessmentId]);
  const submit = useCallback(async () => {
    if (!attempt || busy.current || submitted.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await persist();
      const current = snapshot.current;
      const result = await lmsApi.submit(
        assessmentId,
        attempt.attemptId,
        Object.values(current?.answers || {}),
        current?.flags || [],
      );
      submitted.current = true;
      await clearDraft(userId, assessmentId);
      snapshot.current = null;
      onSubmitted(result.attemptId);
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error
            ? e.message
            : "Submission failed. Your draft is retained.",
        );
    } finally {
      busy.current = false;
      if (active.current) setSubmitting(false);
    }
  }, [attempt, assessmentId, userId, persist, onSubmitted]);
  useEffect(() => {
    const timer = setInterval(() => void persist(), 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void persist();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      void persist();
    };
  }, [persist]);
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const left = remainingSeconds(
        attempt.expiresAt,
        Date.now(),
        offset.current,
      );
      setSeconds(left);
      if (left === 0 && !expirySubmitted.current) {
        expirySubmitted.current = true;
        void submit();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt, submit]);
  async function discard() {
    await clearDraft(userId, assessmentId);
    setPendingDraft(null);
    setAttempt(null);
    setAnswers({});
    setFlags([]);
    snapshot.current = null;
    await initialize();
  }
  return {
    attempt,
    pendingDraft,
    answers,
    flags,
    seconds,
    error,
    loading,
    submitting,
    savedAt,
    submit,
    persist,
    initialize,
    discard,
    resume: () => initialize(pendingDraft),
    answer: (value: Answer) =>
      setAnswers((old) => ({ ...old, [value.questionId]: value })),
    toggleFlag: (id: number) =>
      setFlags((old) =>
        old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
      ),
  };
}
