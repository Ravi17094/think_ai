import AsyncStorage from '@react-native-async-storage/async-storage';

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

const listeners = new Set<() => void>();

function publish(next: string[]): void {
  ids = next;
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
    hydratePromise = AsyncStorage.getItem(WISHLIST_STORAGE_KEY)
      .then((raw) => {
        ids = parseStored(raw);
        return ids;
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
  return next;
}

export function addToWishlist(courseId: string): string[] {
  if (ids.includes(courseId)) {
    return ids;
  }
  const next = [courseId, ...ids];
  publish(next);
  void persist(next);
  return next;
}

export function removeFromWishlist(courseId: string): string[] {
  if (!ids.includes(courseId)) {
    return ids;
  }
  const next = ids.filter((id) => id !== courseId);
  publish(next);
  void persist(next);
  return next;
}

/** Test seam: resets the in-memory store between suites. */
export function __resetWishlistForTests(): void {
  ids = [];
  hydratePromise = null;
  hydrated = false;
  listeners.clear();
}
