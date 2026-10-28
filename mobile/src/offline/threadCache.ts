import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ForumThread } from '@/types';

/**
 * AsyncStorage cache of the first Forum page.
 *
 * A cached page is only served for `THREAD_CACHE_TTL_MS`; after that it is
 * treated as a miss (and purged) so stale threads never masquerade as live
 * data. The clock is injectable so TTL behaviour is unit-testable.
 */

export const THREAD_CACHE_TTL_MS = 15 * 60 * 1000;
export const THREAD_CACHE_KEY = 'thinkz_forum_threads_cache_v1';

export interface ThreadCacheEntry {
  threads: ForumThread[];
  cachedAt: number;
}

/** A cache entry is fresh while it is younger than the TTL. */
export function isCacheFresh(
  cachedAt: number,
  now: number = Date.now()
): boolean {
  const age = now - cachedAt;
  return age >= 0 && age < THREAD_CACHE_TTL_MS;
}

/**
 * Reads the cached forum page.
 *
 * Returns `null` when the cache is empty, malformed or older than the TTL —
 * and removes expired entries so a later read is a guaranteed miss.
 */
export async function readThreadCache(
  now: number = Date.now()
): Promise<ThreadCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(THREAD_CACHE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as ThreadCacheEntry;
    if (
      !parsed ||
      !Array.isArray(parsed.threads) ||
      typeof parsed.cachedAt !== 'number'
    ) {
      return null;
    }
    if (!isCacheFresh(parsed.cachedAt, now)) {
      await AsyncStorage.removeItem(THREAD_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeThreadCache(
  threads: ForumThread[],
  now: number = Date.now()
): Promise<void> {
  try {
    const entry: ThreadCacheEntry = { threads, cachedAt: now };
    await AsyncStorage.setItem(THREAD_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // A storage failure must never break the live forum request.
  }
}

export async function clearThreadCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(THREAD_CACHE_KEY);
  } catch {
    // Ignore — nothing to clean up.
  }
}
