import { screen } from '@testing-library/react-native';

import { createForumThreadFactory } from '@/mock/factories';
import { THREAD_CACHE_TTL_MS, writeThreadCache } from '@/offline/threadCache';
import { ForumHomeScreen } from '@/screens/forum/ForumHomeScreen';
import { createCommunityTestClient } from '@/tests/communityClientStub';
import { flushAllPendingWork, renderScreen } from '@/tests/helpers';
import { __setOnlineForTests } from '@/utils/connectivity';

const makeThread = createForumThreadFactory(1);
const CACHED_THREADS = [makeThread(0, ['cat-1'], ['jest'])];

function renderForum(
  client: ReturnType<typeof createCommunityTestClient>
): void {
  renderScreen(ForumHomeScreen, { client, name: 'ForumHome' });
}

describe('Forum offline read mode', () => {
  it('serves the cached page with a banner when the live request fails', async () => {
    await writeThreadCache(CACHED_THREADS);
    const client = createCommunityTestClient({
      fetchForumThreads: jest.fn().mockRejectedValue(new Error('Forum offline')),
    });

    renderForum(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('offline-banner')).toBeTruthy();
    expect(
      screen.getByTestId(`forum-thread-list-${CACHED_THREADS[0]!.id}-title`)
    ).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('falls through to the error state once the cache is stale', async () => {
    await writeThreadCache(
      CACHED_THREADS,
      Date.now() - THREAD_CACHE_TTL_MS - 1
    );
    const client = createCommunityTestClient({
      fetchForumThreads: jest.fn().mockRejectedValue(new Error('Forum offline')),
    });

    renderForum(client);
    await flushAllPendingWork();

    expect(screen.queryByTestId('offline-banner')).toBeNull();
    expect(screen.getByTestId('error-state')).toBeTruthy();
  });

  it('shows the banner while offline even when the live request succeeds', async () => {
    __setOnlineForTests(false);
    const client = createCommunityTestClient();

    renderForum(client);
    await flushAllPendingWork();

    expect(screen.getByTestId('offline-banner')).toBeTruthy();
    expect(screen.getByText('45 threads in the community')).toBeTruthy();
  });
});
