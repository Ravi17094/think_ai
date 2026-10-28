import { useCallback, useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const RECENT_SEARCHES_KEY = '@thinkzai/recent-searches';
export const MAX_RECENT_SEARCHES = 8;

function sanitize(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of list) {
    if (typeof entry !== 'string') {
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed === '' || seen.has(trimmed.toLowerCase())) {
      continue;
    }
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
    if (result.length === MAX_RECENT_SEARCHES) {
      break;
    }
  }
  return result;
}

/**
 * Recent searches persisted in AsyncStorage.
 *
 * De-duplicates case-insensitively and caps the list at
 * `MAX_RECENT_SEARCHES` so the strip never grows without bound.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((raw) => {
        if (!active) {
          return;
        }
        setRecent(raw === null ? [] : sanitize(JSON.parse(raw)));
        setIsHydrated(true);
      })
      .catch(() => {
        if (active) {
          setRecent([]);
          setIsHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    setRecent(next);
    void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  }, []);

  const addRecentSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (trimmed === '') {
        return;
      }
      const withoutDuplicate = recent.filter(
        (entry) => entry.toLowerCase() !== trimmed.toLowerCase()
      );
      persist([trimmed, ...withoutDuplicate].slice(0, MAX_RECENT_SEARCHES));
    },
    [persist, recent]
  );

  const removeRecentSearch = useCallback(
    (term: string) => {
      persist(
        recent.filter((entry) => entry.toLowerCase() !== term.toLowerCase())
      );
    },
    [persist, recent]
  );

  const clearRecentSearches = useCallback(() => {
    persist([]);
    void AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }, [persist]);

  return {
    recent,
    isHydrated,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
}

export default useRecentSearches;
