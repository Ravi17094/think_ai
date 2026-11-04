import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getWishlistIds,
  hydrateWishlist,
  isWishlistHydrated,
  removeFromWishlist,
  subscribeToWishlist,
  toggleWishlist,
} from '@/features/wishlist/wishlistStore';

/**
 * Reactive wishlist state shared by every course surface.
 *
 * Restores the persisted ids on mount and re-renders whenever another screen
 * saves or removes a course.
 */
export function useWishlist() {
  const [ids, setIds] = useState<string[]>(getWishlistIds());

  useEffect(() => {
    let active = true;
    void hydrateWishlist().then((next) => {
      if (active) {
        setIds(next);
      }
    });
    const unsubscribe = subscribeToWishlist(() => setIds(getWishlistIds()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const savedCourseIds = useMemo(() => new Set(ids), [ids]);

  const toggle = useCallback((courseId: string) => {
    toggleWishlist(courseId);
  }, []);

  const remove = useCallback((courseId: string) => {
    removeFromWishlist(courseId);
  }, []);

  const isSaved = useCallback(
    (courseId: string) => savedCourseIds.has(courseId),
    [savedCourseIds]
  );

  return {
    ids,
    savedCourseIds,
    count: ids.length,
    isSaved,
    toggle,
    remove,
    isReady: isWishlistHydrated(),
  };
}

export default useWishlist;
