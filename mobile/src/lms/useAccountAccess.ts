import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SessionState } from "@/api/session";
import { lmsApi, LmsApiError } from "./api";
import type { Profile } from "./types";
type Account = Profile["user"];
type Snapshot = {
  key: string | null;
  account: Account | null;
  error: string | null;
};
const cacheKey = (userId: string) => `thinkz_lms_account:${userId}`;
const isAccount = (value: unknown): value is Account =>
  !!value &&
  typeof value === "object" &&
  Number.isInteger((value as Account).id) &&
  typeof (value as Account).email === "string" &&
  typeof (value as Account).role === "string" &&
  ((value as Account).name === null ||
    typeof (value as Account).name === "string");

export function useAccountAccess(session: SessionState, online: boolean) {
  const actor = session.token ? `${session.userId}:${session.token}` : null;
  const active = useRef(actor);
  active.current = actor;
  const sequence = useRef(0);
  const latest = useRef<Snapshot>({ key: null, account: null, error: null });
  const [snapshot, setSnapshot] = useState(latest.current);
  const publish = (value: Snapshot) => {
    latest.current = value;
    setSnapshot(value);
  };
  const refreshAccess = useCallback(async () => {
    const run = ++sequence.current;
    const current = () => run === sequence.current && active.current === actor;
    if (!session.token || !actor) {
      publish({ key: null, account: null, error: null });
      return;
    }
    const previous =
      latest.current.key === actor ? latest.current.account : null;
    if (!previous) publish({ key: actor, account: null, error: null });
    async function cachedLearner(): Promise<Account | null> {
      try {
        const cached = JSON.parse(
          (await AsyncStorage.getItem(cacheKey(session.userId))) || "null",
        );
        return cached?.token === session.token &&
          isAccount(cached.user) &&
          String(cached.user.id) === session.userId &&
          cached.user.role.toLowerCase() === "learner"
          ? cached.user
          : null;
      } catch {
        return null;
      }
    }
    try {
      if (!online) {
        const account = previous || (await cachedLearner());
        if (!account)
          throw new Error(
            "Connect once to verify this account before using it offline.",
          );
        if (current()) publish({ key: actor, account, error: null });
        return;
      }
      const profile = await lmsApi.profile(session.token);
      if (
        !isAccount(profile.user) ||
        String(profile.user.id) !== session.userId
      )
        throw new Error(
          "The signed-in account could not be verified. Sign in again.",
        );
      if (!current()) return;
      publish({ key: actor, account: profile.user, error: null });
      try {
        if (profile.user.role.toLowerCase() === "learner")
          await AsyncStorage.setItem(
            cacheKey(session.userId),
            JSON.stringify({ token: session.token, user: profile.user }),
          );
        else await AsyncStorage.removeItem(cacheKey(session.userId));
      } catch {
        /* Identity remains verified if device storage is full. */
      }
    } catch (error) {
      if (!current()) return;
      const network = error instanceof LmsApiError && error.status === 0;
      const account = network ? previous || (await cachedLearner()) : null;
      if (!current()) return;
      if (account) publish({ key: actor, account, error: null });
      else {
        if (error instanceof LmsApiError && [401, 403].includes(error.status))
          await AsyncStorage.removeItem(cacheKey(session.userId)).catch(
            () => {},
          );
        if (current())
          publish({
            key: actor,
            account: null,
            error:
              error instanceof Error
                ? error.message
                : "Account access could not be verified.",
          });
      }
    }
  }, [actor, session.token, session.userId, online]);
  useEffect(() => {
    void refreshAccess();
    return () => {
      sequence.current++;
    };
  }, [refreshAccess]);
  const current = snapshot.key === actor;
  const account = current ? snapshot.account : null;
  const accessError = current ? snapshot.error : null;
  const accessStatus: "signed-out" | "checking" | "ready" | "error" =
    !session.token
      ? "signed-out"
      : account
        ? "ready"
        : accessError
          ? "error"
          : "checking";
  return { account, accessStatus, accessError, refreshAccess };
}
