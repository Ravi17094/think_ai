import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/**
 * Connectivity seam for the offline Forum + Bookmarks module.
 *
 * `NetInfo` is the source of truth on device. This module subscribes lazily,
 * keeps the last known state in memory, and publishes changes so hooks can
 * react (the offline banner) and queued work can flush on reconnect.
 */

export type ConnectivityListener = (isOnline: boolean) => void;

/**
 * Pure mapping from a NetInfo state to "is the backend reachable?".
 *
 * Exported so the rule is unit-testable without a device: only a *known*
 * disconnect (`false`) counts as offline; an unknown `null` is treated as
 * online to avoid hiding content on transient probes.
 */
export function deriveIsOnline(
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>
): boolean {
  if (state.isConnected === false) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
}

let isOnline = true;
let detach: (() => void) | null = null;
const listeners = new Set<ConnectivityListener>();

function publish(next: boolean): void {
  if (next === isOnline) {
    return;
  }
  isOnline = next;
  listeners.forEach((listener) => listener(isOnline));
}

function attach(): void {
  if (detach !== null) {
    return;
  }
  // NetInfo invokes the listener immediately with the current state, so a
  // separate initial `fetch()` is unnecessary (and would race the test seam,
  // flipping a deliberately-offline state back to online).
  detach = NetInfo.addEventListener((state) => publish(deriveIsOnline(state)));
}

/** Latest known connectivity. Defaults to online until NetInfo reports. */
export function getIsOnline(): boolean {
  return isOnline;
}

export function subscribeToConnectivity(
  listener: ConnectivityListener
): () => void {
  listeners.add(listener);
  listener(isOnline);
  attach();
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam — drives the same publish path NetInfo would. */
export function __setOnlineForTests(next: boolean): void {
  publish(next);
}

/** Test seam — clears listeners and detaches the NetInfo subscription. */
export function __resetConnectivityForTests(): void {
  listeners.clear();
  if (detach !== null) {
    detach();
    detach = null;
  }
  isOnline = true;
}
