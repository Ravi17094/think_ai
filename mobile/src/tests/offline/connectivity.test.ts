import {
  deriveIsOnline,
  getIsOnline,
  subscribeToConnectivity,
  __setOnlineForTests,
} from '@/utils/connectivity';

describe('connectivity', () => {
  it('treats an unknown reachability as online', () => {
    expect(deriveIsOnline({ isConnected: true, isInternetReachable: null })).toBe(
      true
    );
  });

  it('is offline only when a disconnect is known', () => {
    expect(deriveIsOnline({ isConnected: false, isInternetReachable: true })).toBe(
      false
    );
    expect(deriveIsOnline({ isConnected: true, isInternetReachable: false })).toBe(
      false
    );
    expect(deriveIsOnline({ isConnected: true, isInternetReachable: true })).toBe(
      true
    );
  });

  it('defaults to online', () => {
    expect(getIsOnline()).toBe(true);
  });

  it('notifies subscribers immediately and on every change', () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeToConnectivity((online) => seen.push(online));

    __setOnlineForTests(false);
    __setOnlineForTests(false);
    __setOnlineForTests(true);

    expect(seen).toEqual([true, false, true]);
    unsubscribe();
  });

  it('stops notifying once unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToConnectivity(listener);
    listener.mockClear();

    unsubscribe();
    __setOnlineForTests(false);

    expect(listener).not.toHaveBeenCalled();
  });
});
