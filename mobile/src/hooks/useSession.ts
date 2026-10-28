import { useEffect, useState } from 'react';

import {
  getSession,
  restoreSession,
  subscribeToSession,
  type SessionState,
} from '@/api/session';

/**
 * Reactive view of the sign-in session (Pages 6–10).
 *
 * Restores the persisted identity on first mount and re-renders on
 * sign-in / sign-out / user-switch events.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<SessionState>(getSession());

  useEffect(() => {
    void restoreSession().then(setSession);
    return subscribeToSession(setSession);
  }, []);

  return session;
}

export default useSession;
