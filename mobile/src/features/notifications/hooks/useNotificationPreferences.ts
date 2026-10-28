import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useApiClient } from '@/hooks/useApiClient';
import { useSession } from '@/hooks/useSession';
import { toErrorMessage } from '@/hooks/useAsyncResource';
import { DEFAULT_PREFS } from '../constants';
import type {
  Channel,
  NotificationPrefs,
  SaveNotificationPrefsPayload,
} from '../types';

/**
 * Notification preferences data source.
 *
 * Reads `GET /users/:id/notification-preferences` on mount (prefetching the
 * server state before the learner toggles anything) and persists the full
 * matrix with `PATCH`. Both calls go through the injected API client so tests
 * never touch `fetch` and the a11y/lint rules see no raw transport here.
 */
export function useNotificationPreferences() {
  const client = useApiClient();
  const { userId } = useSession();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [original, setOriginal] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .fetchNotificationPreferences(userId)
      .then((response) => {
        if (cancelled) return;
        const next = { ...DEFAULT_PREFS, ...response };
        setPrefs(next);
        setOriginal(next);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(toErrorMessage(cause));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(original),
    [prefs, original]
  );

  const setGroupChannel = useCallback(
    (group: keyof NotificationPrefs, channel: Channel, value: boolean) => {
      setPrefs((prev) => ({
        ...prev,
        [group]: { ...prev[group], [channel]: value },
      }));
    },
    []
  );

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const payload: SaveNotificationPrefsPayload = prefs;
      const saved = await client.saveNotificationPreferences(userId, payload);
      if (!mounted.current) return true;
      const next = { ...DEFAULT_PREFS, ...saved };
      setPrefs(next);
      setOriginal(next);
      setSavedAt(new Date());
      return true;
    } catch (cause) {
      if (mounted.current) {
        setError(toErrorMessage(cause));
      }
      return false;
    } finally {
      if (mounted.current) {
        setSaving(false);
      }
    }
  }, [client, prefs, userId]);

  const reset = useCallback(() => {
    setPrefs(original);
    setError(null);
  }, [original]);

  return {
    prefs,
    original,
    loading,
    saving,
    error,
    savedAt,
    hasUnsavedChanges,
    setGroupChannel,
    save,
    reset,
  };
}

export default useNotificationPreferences;
