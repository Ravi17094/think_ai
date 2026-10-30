import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LmsProvider, useLms } from "@/lms/LmsProvider";
import { lmsApi } from "@/lms/api";
import { enqueueProgress, loadQueue } from "@/lms/storage";
let mockNetwork: (state: { isConnected: boolean }) => void;
let mockRole = "Learner";
let mockSession = { userId: "1", token: "token", isSignedIn: true };
const mockRefresh = jest.fn(async () => {});
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn(callback => {
  mockNetwork = callback; callback({ isConnected: false }); return jest.fn();
}) }));
jest.mock("@/api/session", () => ({ getSession: () => mockSession,
  restoreSession: async () => mockSession, subscribeToSession: () => jest.fn() }));
jest.mock("@/lms/useAccountAccess", () => ({ useAccountAccess: () => ({
  account: { role: mockRole }, accessStatus: "ready", accessError: null, refreshAccess: mockRefresh,
}) }));
jest.mock("@/lms/api", () => ({ lmsApi: { sync: jest.fn() }, LmsApiError: class extends Error { status = 0; } }));
function Probe() {
  const { syncStatus, versions } = useLms();
  return <><Text>{syncStatus}</Text><Text>{versions["2:3"]?.watchedSeconds ?? "no canonical progress"}</Text></>;
}
const update = { enrollmentId: 2, lessonId: 3, watchedSeconds: 90,
  updatedAt: "2026-10-27T12:00:00Z", baseVersion: null };
beforeEach(async () => {
  await AsyncStorage.clear(); jest.clearAllMocks(); mockRole = "Learner";
  mockSession = { userId: "1", token: "token", isSignedIn: true };
  (lmsApi.sync as jest.Mock).mockResolvedValue([{ enrollmentId: 2, lessonId: 3, conflict: true,
    progress: { ...update, watchedSeconds: 20, updatedAt: "2026-10-27T13:00:00Z" } }]);
});
test("NetInfo reconnect drains persisted progress and applies canonical server conflicts", async () => {
  const view = render(<LmsProvider><Probe /></LmsProvider>);
  await waitFor(() => expect(view.getByText("Offline - progress stays on this device")).toBeTruthy());
  await enqueueProgress("1", update);
  expect(lmsApi.sync).not.toHaveBeenCalled();
  await act(async () => { mockNetwork({ isConnected: true }); });
  await waitFor(() => expect(view.getByText("Synced; newer server progress kept.")).toBeTruthy());
  expect(lmsApi.sync).toHaveBeenCalledWith([update], "token");
  expect(view.getByText("20")).toBeTruthy();
  expect(await loadQueue("1")).toEqual([]);
});
test("failed reconnect retains queue and the following reconnect retries it", async () => {
  (lmsApi.sync as jest.Mock).mockRejectedValueOnce(new Error("Network unavailable"));
  const view = render(<LmsProvider><Probe /></LmsProvider>);
  await waitFor(() => expect(view.getByText("Offline - progress stays on this device")).toBeTruthy());
  await enqueueProgress("1", update);
  await act(async () => { mockNetwork({ isConnected: true }); });
  await waitFor(() => expect(view.getByText("Progress saved on device; sync will retry.")).toBeTruthy());
  expect(await loadQueue("1")).toEqual([update]);
  await act(async () => { mockNetwork({ isConnected: false }); });
  await act(async () => { mockNetwork({ isConnected: true }); });
  await waitFor(async () => expect(await loadQueue("1")).toEqual([]));
  expect(lmsApi.sync).toHaveBeenCalledTimes(2);
});
test("administrator reconnect never uploads a learner progress queue", async () => {
  mockRole = "Admin";
  const view = render(<LmsProvider><Probe /></LmsProvider>);
  await waitFor(() => expect(view.getByText("Offline - progress stays on this device")).toBeTruthy());
  await enqueueProgress("1", update);
  await act(async () => { mockNetwork({ isConnected: true }); });
  expect(lmsApi.sync).not.toHaveBeenCalled();
  expect(await loadQueue("1")).toEqual([update]);
});

test("playback during sync uses the acknowledged version and saves the newer progress", async () => {
  let completeFirst!: (value: any) => void;
  const first = new Promise(resolve => { completeFirst = resolve; });
  const v1 = "2026-10-27T13:00:00Z", v2 = "2026-10-27T13:01:00Z";
  (lmsApi.sync as jest.Mock).mockReset().mockReturnValueOnce(first).mockImplementation(async (rows) =>
    rows.map((row: any) => ({ enrollmentId: 2, lessonId: 3, conflict: row.baseVersion !== v1,
      progress: { ...row, watchedSeconds: row.baseVersion === v1 ? 100 : 90, updatedAt: v2 } })),
  );
  const view = render(<LmsProvider><Probe /></LmsProvider>);
  await waitFor(() => expect(view.getByText("Offline - progress stays on this device")).toBeTruthy());
  await enqueueProgress("1", update);
  await act(async () => { mockNetwork({ isConnected: true }); });
  await waitFor(() => expect(lmsApi.sync).toHaveBeenCalledTimes(1));
  await enqueueProgress("1", { ...update, watchedSeconds: 100, updatedAt: "2026-10-27T12:01:00Z" });
  await act(async () => { completeFirst([{ enrollmentId: 2, lessonId: 3, conflict: false,
    progress: { ...update, updatedAt: v1 } }]); });
  await waitFor(() => expect(lmsApi.sync).toHaveBeenCalledTimes(2));
  expect((lmsApi.sync as jest.Mock).mock.calls[1][0][0].baseVersion).toBe(v1);
  await waitFor(() => expect(view.getByText("100")).toBeTruthy());
  expect(await loadQueue("1")).toEqual([]);
  expect(view.getByText("Up to date")).toBeTruthy();
});

test("a genuine server conflict keeps server progress even when more playback was queued", async () => {
  let completeFirst!: (value: any) => void;
  (lmsApi.sync as jest.Mock).mockReset().mockReturnValueOnce(new Promise(resolve => { completeFirst = resolve; }));
  const view = render(<LmsProvider><Probe /></LmsProvider>);
  await waitFor(() => expect(view.getByText("Offline - progress stays on this device")).toBeTruthy());
  await enqueueProgress("1", update);
  await act(async () => { mockNetwork({ isConnected: true }); });
  await waitFor(() => expect(lmsApi.sync).toHaveBeenCalledTimes(1));
  await enqueueProgress("1", { ...update, watchedSeconds: 100, updatedAt: "2026-10-27T12:01:00Z" });
  await act(async () => { completeFirst([{ enrollmentId: 2, lessonId: 3, conflict: true,
    progress: { ...update, watchedSeconds: 20, updatedAt: "2026-10-27T13:00:00Z" } }]); });
  await waitFor(() => expect(view.getByText("Synced; newer server progress kept.")).toBeTruthy());
  expect(view.getByText("20")).toBeTruthy();
  expect(await loadQueue("1")).toEqual([]);
  expect(lmsApi.sync).toHaveBeenCalledTimes(1);
});
