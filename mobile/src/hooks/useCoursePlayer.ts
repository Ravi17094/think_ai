// Adapted from the Desktop task archives to the current authenticated LMS API and data types.
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lmsApi, LmsApiError } from "@/lms/api";
import { downloadLesson, localVideo } from "@/lms/downloads";
import { useLms } from "@/lms/LmsProvider";
import { enqueueProgress, read, storageKey } from "@/lms/storage";
import type { Lesson, PlayerData } from "@/lms/types";
import { useLmsResource } from "@/lms/useLmsResource";
import { hasCompletedLesson } from "@/lms/completion";
const isPlayer = (v: unknown): v is PlayerData =>
  !!v && typeof v === "object" && "course" in v && "enrollmentId" in v &&
  Array.isArray((v as PlayerData).course.modules);
export function useCoursePlayer(courseId: number, requestedLessonId?: number) {
  const { session, online, sync, versions } = useLms();
  const cacheKey = storageKey(session.userId, `player:${courseId}`);
  const fetcher = useCallback(async () => {
    try {
      const value = await lmsApi.player(courseId);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(value));
      return value;
    } catch (e) {
      if (e instanceof LmsApiError && e.status === 0) {
        const cached = await read(
          cacheKey,
          (v): v is PlayerData | null => v === null || isPlayer(v),
          null,
        );
        if (cached) return cached;
      }
      throw e;
    }
  }, [courseId, cacheKey, session.token]);
  const resource = useLmsResource(fetcher);
  const [selected, setSelected] = useState<number | null>(
    requestedLessonId || null,
  );
  const [uri, setUri] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [download, setDownload] = useState<number | null>(null);
  const lastSaved = useRef(0);
  const position = useRef(0);
  const restoredPosition = useRef(0);
  const [initialPosition, setInitialPosition] = useState(0);
  const [localWatched, setLocalWatched] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!resource.data) return;
    setLocalWatched((old) => {
      const updated = { ...old };
      for (const progress of Object.values(versions)) {
        if (progress && progress.enrollmentId === resource.data?.enrollmentId)
          updated[progress.lessonId] = progress.watchedSeconds;
      }
      return updated;
    });
  }, [versions, resource.data?.enrollmentId]);
  const lessons = resource.data?.course.modules.flatMap((m) => m.lessons) || [];
  const lesson = lessons.find((l) => l.id === selected) || lessons[0];
  useEffect(() => {
    if (!resource.data) return;
    let alive = true;
    void read(
      storageKey(session.userId, `lastLesson:${courseId}`),
      (v): v is number | null => v === null || Number.isInteger(v),
      null,
    ).then((id) => {
      if (alive && !selected && !requestedLessonId && id) setSelected(id);
    });
    return () => {
      alive = false;
    };
  }, [resource.data?.enrollmentId]);
  useEffect(() => {
    let alive = true;
    setUri(null);
    setMessage("");
    position.current = 0;
    lastSaved.current = 0;
    if (!lesson) return;
    async function load(currentLesson: Lesson) {
      try {
        const saved = await read(
          storageKey(session.userId, `position:${currentLesson.id}`),
          (v): v is number =>
            typeof v === "number" && Number.isFinite(v) && v >= 0,
          0,
        );
        const local = await localVideo(session.userId, currentLesson);
        if (alive) {
          restoredPosition.current = saved;
          position.current = saved;
          setInitialPosition(saved * 1000);
          setUri(local);
        }
        await AsyncStorage.setItem(
          storageKey(session.userId, `lastLesson:${courseId}`),
          JSON.stringify(currentLesson.id),
        );
      } catch (e) {
        if (alive)
          setMessage(e instanceof Error ? e.message : "Cannot open the video.");
      }
    }
    void load(lesson);
    return () => {
      alive = false;
    };
  }, [lesson?.id, session.userId]);
  const saveProgress = useCallback(
    async (seconds: number) => {
      if (!lesson || !resource.data) return;
      const key = `${resource.data.enrollmentId}:${lesson.id}`;
      const canonical = Object.prototype.hasOwnProperty.call(versions, key)
        ? versions[key]
        : resource.data.progress.find((p) => p.lessonId === lesson.id);
      await AsyncStorage.setItem(
        storageKey(session.userId, `position:${lesson.id}`),
        JSON.stringify(seconds),
      );
      await enqueueProgress(session.userId, {
        lessonId: lesson.id,
        enrollmentId: resource.data.enrollmentId,
        watchedSeconds: seconds,
        updatedAt: new Date().toISOString(),
        baseVersion: canonical?.updatedAt || null,
      });
      setLocalWatched((old) => ({ ...old, [lesson.id]: seconds }));
    },
    [lesson?.id, resource.data, session.userId, versions],
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" && position.current > 0)
        void saveProgress(position.current).catch(() => undefined);
    });
    return () => {
      sub.remove();
      if (position.current > 0)
        void saveProgress(position.current).catch(() => undefined);
    };
  }, [saveProgress]);
  function playback(seconds: number, didFinish = false) {
    position.current = seconds;
    if (
      didFinish ||
      Math.abs(position.current - lastSaved.current) >= 15 ||
      position.current > 0
    ) {
      lastSaved.current = position.current;
      void saveProgress(
        didFinish && lesson ? lesson.durationSeconds : position.current,
      )
        .then(() => {
          if (online) void sync();
        })
        .catch(() =>
          setMessage("Unable to save progress. Free device storage and retry."),
        );
    }
  }
  async function downloadCurrent() {
    if (!lesson) return;
    setDownload(0);
    try {
      await downloadLesson(session.userId, courseId, lesson, setDownload);
      setMessage("Video saved for offline playback.");
      setUri(await localVideo(session.userId, lesson));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownload(null);
    }
  }
  const completed = lessons.filter(
    (l) =>
      resource.data?.progress.some((p) => p.lessonId === l.id && p.completed) ||
      (hasCompletedLesson(l, localWatched[l.id] ?? 0) &&
        l.durationSeconds > 0),
  ).length;
  return { resource, lesson, lessons, uri, message, download,
    initialPosition, completed, online, playback, downloadCurrent, setSelected };
}
