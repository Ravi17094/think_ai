// Adapted from the Desktop task archives to the current authenticated LMS API and data types.
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getSession, type SessionState } from "@/api/session";
import { lmsApi, LmsApiError } from "@/lms/api";
import { acknowledgeProgress, loadQueue } from "@/lms/storage";
import { isAdministrator } from "@/lms/access";
import type { Progress } from "@/lms/types";
export function useProgressSync(session: SessionState, online: boolean, role: string | null, refreshAccess: () => Promise<void>) {
  const [syncStatus, setSyncStatus] = useState("Up to date");
  const [versions, setVersions] = useState<Record<string, Progress | null>>({});
  const accountRole = useRef<string | null>(null);
  accountRole.current = role || null;
  const busy = useRef(false);
  const sync = useCallback(async () => {
    if (
      busy.current ||
      !online ||
      !session.token ||
      !accountRole.current ||
      isAdministrator(accountRole.current)
    )
      return;
    busy.current = true;
    const userId = session.userId;
    const token = session.token;
    try {
      let queue = await loadQueue(userId);
      if (queue.length) setSyncStatus(`Syncing ${queue.length} update(s)...`);
      let conflicts = 0;
      while (
        queue.length &&
        getSession().userId === userId &&
        getSession().token === token &&
        accountRole.current !== null &&
        !isAdministrator(accountRole.current)
      ) {
        const sent = queue.slice(0, 100);
        const result = await lmsApi.sync(sent, token);
        if (getSession().userId !== userId) break;
        conflicts += result.filter((r) => r.conflict).length;
        setVersions((old) => ({
          ...old,
          ...Object.fromEntries(
            result.map((r) => [`${r.enrollmentId}:${r.lessonId}`, r.progress]),
          ),
        }));
        await acknowledgeProgress(userId, sent);
        queue = await loadQueue(userId);
      }
      if (getSession().userId === userId)
        setSyncStatus(
          conflicts ? "Synced; newer server progress kept." : "Up to date",
        );
    } catch (e) {
      if (getSession().userId === userId)
        setSyncStatus(
          e instanceof LmsApiError && e.status === 401
            ? "Sign in again to sync."
            : "Progress saved on device; sync will retry.",
        );
    } finally {
      busy.current = false;
    }
  }, [online, session, role]);
  useEffect(() => {
    setVersions({});
  }, [session.userId]);
  useEffect(() => {
    if (!online) setSyncStatus("Offline - progress stays on this device");
    else void sync();
    const timer = setInterval(() => void sync(), 15000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshAccess();
        void sync();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [sync, online, refreshAccess]);
  return { syncStatus, sync, versions };
}
