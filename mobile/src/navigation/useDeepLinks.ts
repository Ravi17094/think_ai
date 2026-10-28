import { useCallback, useEffect, useRef } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';

import {
  getInitialDeepLink,
  subscribeToDeepLinks,
  type DeepLinkResolution,
} from './deepLinks';
import type { RootStackParamList } from './types';

/**
 * Bridges incoming deep links to the navigator.
 *
 * Applies sign-in gating (auth-gated routes bounce to the dashboard) and
 * defers the launch URL until the container reports ready via `handleReady`,
 * which should be wired to `NavigationContainer`'s `onReady`.
 */
export function useDeepLinks(
  navigationRef: NavigationContainerRef<RootStackParamList>
): { handleReady: () => void } {
  const pending = useRef<DeepLinkResolution | null>(null);

  const apply = useCallback(
    (resolution: DeepLinkResolution) => {
      if (resolution.status === 'not-found') {
        return;
      }
      if (!navigationRef.isReady()) {
        pending.current = resolution;
        return;
      }
      if (resolution.status === 'auth-required') {
        navigationRef.navigate(resolution.redirectTo);
        return;
      }
      const { screen, params } = resolution.route;
      const navigate = navigationRef.navigate as unknown as (
        name: string,
        args?: object
      ) => void;
      navigate(screen, params);
    },
    [navigationRef]
  );

  useEffect(() => {
    const unsubscribe = subscribeToDeepLinks(apply);
    void getInitialDeepLink().then((resolution) => {
      if (resolution) {
        apply(resolution);
      }
    });
    return unsubscribe;
  }, [apply]);

  const handleReady = useCallback(() => {
    const resolution = pending.current;
    pending.current = null;
    if (resolution) {
      apply(resolution);
    }
  }, [apply]);

  return { handleReady };
}

export default useDeepLinks;
