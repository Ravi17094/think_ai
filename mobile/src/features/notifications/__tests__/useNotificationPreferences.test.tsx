import { act, renderHook } from '@testing-library/react-native';

import { ApiClientProvider } from '@/hooks/useApiClient';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork } from '@/tests/helpers';
import type { NotificationPreferences } from '@/types/community';
import { DEFAULT_PREFS } from '../constants';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';

const SERVER_PREFS: NotificationPreferences = {
  ...DEFAULT_PREFS,
  replies: { email: false, inApp: true, sms: false },
  sessions: { email: true, inApp: false, sms: true },
};

function wrapperFor(client: ReturnType<typeof createCommunityTestClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
  };
}

describe('useNotificationPreferences', () => {
  it('prefetches the server matrix on mount', async () => {
    const fetchNotificationPreferences = jest
      .fn()
      .mockResolvedValue(SERVER_PREFS);
    const client = createCommunityTestClient({ fetchNotificationPreferences });

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });

    expect(result.current.loading).toBe(true);
    await flushAllPendingWork();

    expect(fetchNotificationPreferences).toHaveBeenCalledWith('u1');
    expect(result.current.loading).toBe(false);
    expect(result.current.prefs.sessions).toEqual({
      email: true,
      inApp: false,
      sms: true,
    });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('tracks edits and persists the full matrix', async () => {
    const fetchNotificationPreferences = jest
      .fn()
      .mockResolvedValue(SERVER_PREFS);
    const saveNotificationPreferences = jest
      .fn()
      .mockImplementation((_id: string, prefs: NotificationPreferences) =>
        Promise.resolve(prefs)
      );
    const client = createCommunityTestClient({
      fetchNotificationPreferences,
      saveNotificationPreferences,
    });

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });
    await flushAllPendingWork();

    act(() => {
      result.current.setGroupChannel('mentions', 'sms', true);
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    let saved = false;
    await act(async () => {
      saved = await result.current.save();
    });
    await flushAllPendingWork();

    expect(saved).toBe(true);
    expect(saveNotificationPreferences).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        mentions: { email: true, inApp: true, sms: true },
      })
    );
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.savedAt).toBeInstanceOf(Date);
  });

  it('exposes a readable error and keeps edits when saving fails', async () => {
    const client = createCommunityTestClient({
      fetchNotificationPreferences: jest.fn().mockResolvedValue(SERVER_PREFS),
      saveNotificationPreferences: jest
        .fn()
        .mockRejectedValue(new Error('Preferences offline')),
    });

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: wrapperFor(client),
    });
    await flushAllPendingWork();

    act(() => {
      result.current.setGroupChannel('payments', 'email', false);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).toBe('Preferences offline');
    expect(result.current.hasUnsavedChanges).toBe(true);
  });
});
