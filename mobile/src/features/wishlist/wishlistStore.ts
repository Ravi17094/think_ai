import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRemoteWishlist, saveRemoteWishlist } from '@/api/wishlistApi';

/**
 * Saved-course ("Wishlist") store.
 *
 * The backend catalogue has no wishlist endpoint, so the learner's saved
 * course ids live on-device. A tiny module-level store keeps every surface
 * (Home, Explore, Course Detail, Wishlist) in sync and mirrors writes to
 * AsyncStorage so the list survives a relaunch.
 */

export const WISHLIST_STORAGE_KEY = 'thinkz_wishlist_v1';

let ids: string[] = [];
let hydratePromise: Promise<string[]> | null = null;
let hydrated = false;
let mutationVersion = 0;

const listeners = new Set<() => void>();

function publish(next: string[]): void {
  ids = next;
  mutationVersion += 1;
  listeners.forEach((listener) => listener());
}

function parseStored(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (value, index, all): value is string =>
        typeof value === 'string' &&
        value.length > 0 &&
        all.indexOf(value) === index
    );
  } catch {
    return [];
  }
}

async function persist(next: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort persistence: the in-memory list remains authoritative.
  }
}

async function sync(next: string[]): Promise<void> {
  try { await saveRemoteWishlist(next); } catch { /* Offline writes remain in the local cache and retry on next hydrate. */ }
}

export function getWishlistIds(): string[] {
  return ids;
}

export function isWishlistHydrated(): boolean {
  return hydrated;
}

export function subscribeToWishlist(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Loads the persisted list exactly once per app run. */
export function hydrateWishlist(): Promise<string[]> {
  if (hydratePromise === null) {
    const versionAtStart = mutationVersion;
    hydratePromise = AsyncStorage.getItem(WISHLIST_STORAGE_KEY)
      .then(async (raw) => {
        // A user can tap Save before this asynchronous read completes. Never
        // replace that newer in-memory change with an older disk snapshot.
        const cached = mutationVersion === versionAtStart ? parseStored(raw) : ids;
        try {
          const remote = await getRemoteWishlist();
          // The server response may have started before a save/remove tap.
          // In that case it is stale: the user's most recent local change is
          // authoritative and must not be undone by merging the old response.
          if (mutationVersion !== versionAtStart) {
            void sync(ids);
            return ids;
          }
          const merged = [...new Set([...cached, ...remote])];
          publish(merged);
          await persist(merged);
          if (merged.length !== remote.length || merged.some((id, index) => id !== remote[index])) await sync(merged);
          return merged;
        } catch {
          if (mutationVersion === versionAtStart) publish(cached);
          return ids;
        }
      })
      .catch(() => ids)
      .finally(() => {
        hydrated = true;
        listeners.forEach((listener) => listener());
      });
  }
  return hydratePromise;
}

export function toggleWishlist(courseId: string): string[] {
  const next = ids.includes(courseId)
    ? ids.filter((id) => id !== courseId)
    : [courseId, ...ids];
  publish(next);
  void persist(next);
  void sync(next);
  return next;
}

export function addToWishlist(courseId: string): string[] {
  if (ids.includes(courseId)) {
    return ids;
  }
  const next = [courseId, ...ids];
  publish(next);
  void persist(next);
  void sync(next);
  return next;
}

export function removeFromWishlist(courseId: string): string[] {
  if (!ids.includes(courseId)) {
    return ids;
  }
  const next = ids.filter((id) => id !== courseId);
  publish(next);
  void persist(next);
  void sync(next);
  return next;
}

/** Test seam: resets the in-memory store between suites. */
export function __resetWishlistForTests(): void {
  ids = [];
  hydratePromise = null;
  hydrated = false;
  mutationVersion = 0;
  listeners.clear();
}
