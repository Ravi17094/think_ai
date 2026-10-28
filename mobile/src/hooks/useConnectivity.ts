import { useEffect, useState } from 'react';

import { getIsOnline, subscribeToConnectivity } from '@/utils/connectivity';

export interface Connectivity {
  isOnline: boolean;
  isOffline: boolean;
}

/**
 * Reactive connectivity state for the offline module.
 *
 * Subscribes to `src/utils/connectivity`, so any screen can render the offline
 * banner or gate network work without touching NetInfo directly.
 */
export function useConnectivity(): Connectivity {
  const [isOnline, setIsOnline] = useState<boolean>(getIsOnline());

  useEffect(() => subscribeToConnectivity(setIsOnline), []);

  return { isOnline, isOffline: !isOnline };
}

export default useConnectivity;
