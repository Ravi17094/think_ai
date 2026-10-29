import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SessionState } from "@/api/session";
import { lmsApi, LmsApiError } from "@/lms/api";
import type { Profile } from "@/lms/types";
import { useAccountAccess } from "@/lms/useAccountAccess";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/api/session", () => ({
  getSession: jest.fn(),
  restoreSession: jest.fn(),
}));
jest.mock("@/lms/api", () => ({
  lmsApi: { profile: jest.fn() },
  LmsApiError: class extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

type HookProps = { session: SessionState; online: boolean };
const profileMock = lmsApi.profile as jest.Mock;
const accountKey = (userId: string) => `thinkz_lms_account:${userId}`;
const sessionFor = (userId = "7", token = "token-7"): SessionState => ({
  userId,
  token,
  isSignedIn: true,
});
const profileFor = (id = 7, role = "LEARNER"): Profile => ({
  user: { id, name: `User ${id}`, email: `user${id}@example.test`, role },
  stats: { coursesCompleted: 0, certificatesEarned: 0, totalHours: 0 },
  activity: [],
  certificates: [],
});
const renderAccess = (session = sessionFor(), online = true) =>
  renderHook(
    (props: HookProps) => useAccountAccess(props.session, props.online),
    { initialProps: { session, online } },
  );
async function cacheAccount(session: SessionState, user = profileFor().user) {
  await AsyncStorage.setItem(
    accountKey(session.userId),
    JSON.stringify({ token: session.token, user }),
  );
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  profileMock.mockReset();
});

test("uses the server-verified role and removes a learner cache when the server returns Admin", async () => {
  const session = sessionFor();
  await cacheAccount(session);
  const verified = profileFor(7, "Admin");
  profileMock.mockResolvedValue(verified);

  const hook = renderAccess(session);
  await waitFor(() => expect(hook.result.current.accessStatus).toBe("ready"));

  expect(profileMock).toHaveBeenCalledWith(session.token);
  expect(hook.result.current.account).toEqual(verified.user);
  expect(hook.result.current.accessError).toBeNull();
  await waitFor(() =>
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(accountKey("7")),
  );
  expect(await AsyncStorage.getItem(accountKey("7"))).toBeNull();
  hook.unmount();
});

test("an old actor's late profile response cannot expose its role after an account switch", async () => {
  const first = deferred<Profile>();
  const second = deferred<Profile>();
  profileMock
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const hook = renderAccess(sessionFor("7", "first-token"));
  await waitFor(() => expect(profileMock).toHaveBeenCalledTimes(1));

  hook.rerender({ session: sessionFor("8", "second-token"), online: true });
  expect(hook.result.current.account).toBeNull();
  expect(hook.result.current.accessStatus).toBe("checking");
  await waitFor(() => expect(profileMock).toHaveBeenCalledTimes(2));

  await act(async () => {
    second.resolve(profileFor(8));
    await second.promise;
  });
  await waitFor(() => expect(hook.result.current.account?.id).toBe(8));
  await act(async () => {
    first.resolve(profileFor(7, "Admin"));
    await first.promise;
  });

  expect(hook.result.current.account).toEqual(profileFor(8).user);
  expect(hook.result.current.accessStatus).toBe("ready");
  expect(hook.result.current.accessError).toBeNull();
  expect(await AsyncStorage.getItem(accountKey("7"))).toBeNull();
  expect(JSON.parse((await AsyncStorage.getItem(accountKey("8")))!)).toEqual({
    token: "second-token",
    user: profileFor(8).user,
  });
  hook.unmount();
});

test("a mismatched server identity fails closed even when a matching learner cache exists", async () => {
  const session = sessionFor();
  await cacheAccount(session);
  profileMock.mockResolvedValue(profileFor(8, "Admin"));

  const hook = renderAccess(session);
  await waitFor(() => expect(hook.result.current.accessStatus).toBe("error"));

  expect(hook.result.current.account).toBeNull();
  expect(hook.result.current.accessError).toMatch(/could not be verified/i);
  hook.unmount();
});

test("an account- and token-matched cached learner can open offline without a profile request", async () => {
  const session = sessionFor();
  await cacheAccount(session, profileFor(7, "Learner").user);

  const hook = renderAccess(session, false);
  await waitFor(() => expect(hook.result.current.accessStatus).toBe("ready"));

  expect(hook.result.current.account).toEqual(profileFor(7, "Learner").user);
  expect(hook.result.current.accessError).toBeNull();
  expect(profileMock).not.toHaveBeenCalled();
  hook.unmount();
});

test("a cached Admin cannot establish offline access", async () => {
  const session = sessionFor();
  await cacheAccount(session, profileFor(7, "Admin").user);

  const hook = renderAccess(session, false);
  await waitFor(() => expect(hook.result.current.accessStatus).toBe("error"));

  expect(hook.result.current.account).toBeNull();
  expect(hook.result.current.accessError).toMatch(/connect once/i);
  expect(profileMock).not.toHaveBeenCalled();
  hook.unmount();
});

test.each([
  ["different token", "old-token", 7],
  ["different user", "token-7", 8],
])(
  "rejects an offline learner cache bound to a %s",
  async (_label, token, id) => {
    const session = sessionFor();
    await AsyncStorage.setItem(
      accountKey(session.userId),
      JSON.stringify({ token, user: profileFor(id as number).user }),
    );

    const hook = renderAccess(session, false);
    await waitFor(() => expect(hook.result.current.accessStatus).toBe("error"));

    expect(hook.result.current.account).toBeNull();
    expect(profileMock).not.toHaveBeenCalled();
    hook.unmount();
  },
);

test.each([401, 403])(
  "HTTP %i revokes previously verified access and removes the cached learner",
  async (status) => {
    const session = sessionFor();
    profileMock.mockResolvedValueOnce(profileFor());
    const hook = renderAccess(session);
    await waitFor(() => expect(hook.result.current.accessStatus).toBe("ready"));
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(accountKey("7"))).not.toBeNull(),
    );
    profileMock.mockRejectedValueOnce(
      new LmsApiError("Account access was revoked.", status, "ACCESS_REVOKED"),
    );

    await act(async () => {
      await hook.result.current.refreshAccess();
    });

    expect(hook.result.current.accessStatus).toBe("error");
    expect(hook.result.current.account).toBeNull();
    expect(hook.result.current.accessError).toBe("Account access was revoked.");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(accountKey("7"));
    expect(await AsyncStorage.getItem(accountKey("7"))).toBeNull();
    hook.unmount();
  },
);

test("refresh applies a server role downgrade instead of retaining Admin access", async () => {
  profileMock
    .mockResolvedValueOnce(profileFor(7, "Admin"))
    .mockResolvedValueOnce(profileFor(7, "LEARNER"));
  const hook = renderAccess();
  await waitFor(() => expect(hook.result.current.account?.role).toBe("Admin"));

  await act(async () => {
    await hook.result.current.refreshAccess();
  });

  expect(hook.result.current.accessStatus).toBe("ready");
  expect(hook.result.current.account?.role).toBe("LEARNER");
  expect(profileMock).toHaveBeenNthCalledWith(2, "token-7");
  expect(JSON.parse((await AsyncStorage.getItem(accountKey("7")))!)).toEqual({
    token: "token-7",
    user: profileFor().user,
  });
  hook.unmount();
});

test("a network failure can recover the matching cached learner", async () => {
  const session = sessionFor();
  await cacheAccount(session);
  profileMock.mockRejectedValue(new LmsApiError("Offline", 0, "NETWORK_ERROR"));

  const hook = renderAccess(session);
  await waitFor(() => expect(hook.result.current.accessStatus).toBe("ready"));

  expect(hook.result.current.account).toEqual(profileFor().user);
  expect(hook.result.current.accessError).toBeNull();
  hook.unmount();
});

test("signing out hides a verified account immediately and ignores subsequent refresh", async () => {
  profileMock.mockResolvedValue(profileFor(7, "Admin"));
  const hook = renderAccess();
  await waitFor(() => expect(hook.result.current.accessStatus).toBe("ready"));

  hook.rerender({
    session: { userId: "7", token: null, isSignedIn: false },
    online: true,
  });
  expect(hook.result.current.accessStatus).toBe("signed-out");
  expect(hook.result.current.account).toBeNull();
  await act(async () => {
    await hook.result.current.refreshAccess();
  });

  expect(hook.result.current.account).toBeNull();
  expect(hook.result.current.accessError).toBeNull();
  expect(profileMock).toHaveBeenCalledTimes(1);
  hook.unmount();
});
