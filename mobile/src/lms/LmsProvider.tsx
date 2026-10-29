import { useProgressSync } from "@/hooks/useProgressSync";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import {
  getSession,
  restoreSession,
  subscribeToSession,
  type SessionState,
} from "@/api/session";
import { useAccountAccess } from "./useAccountAccess";
import type { Profile, Progress } from "./types";
interface Context {
  session: SessionState;
  account: Profile["user"] | null;
  accessStatus: "signed-out" | "checking" | "ready" | "error";
  accessError: string | null;
  refreshAccess: () => Promise<void>;
  ready: boolean;
  online: boolean;
  syncStatus: string;
  sync: () => Promise<void>;
  versions: Record<string, Progress | null>;
}
const LmsContext = createContext<Context>({
  session: getSession(),
  account: null,
  accessStatus: "checking",
  accessError: null,
  refreshAccess: async () => {},
  ready: false,
  online: true,
  syncStatus: "",
  sync: async () => {},
  versions: {},
});
export const useLms = () => useContext(LmsContext);
export function LmsProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(getSession);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const access = useAccountAccess(session, online);
  const { syncStatus, sync, versions } = useProgressSync(session, online, access.account?.role || null, access.refreshAccess);
  useEffect(() => {
    const unsub = subscribeToSession(setSession);
    void restoreSession()
      .then(setSession)
      .finally(() => setReady(true));
    return unsub;
  }, []);
  useEffect(
    () =>
      NetInfo.addEventListener((state) =>
        setOnline(
          state.isConnected !== false && state.isInternetReachable !== false,
        ),
      ),
    [],
  );
  return (
    <LmsContext.Provider
      value={{ session, ready, online, syncStatus, sync, versions, ...access }}
    >
      {children}
    </LmsContext.Provider>
  );
}
