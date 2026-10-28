import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/api/http';
import {
  BOOKMARK_QUEUE_KEY,
  clearBookmarkQueue,
  dedupeBookmarkActions,
  enqueueBookmarkAction,
  getQueuedBookmarkActions,
  removeQueuedBookmarkAction,
  syncQueuedBookmarkActions,
  type QueuedBookmarkAction,
} from '@/offline/bookmarkQueue';

function makeClient(overrides: {
  addBookmark?: jest.Mock;
  removeBookmark?: jest.Mock;
} = {}) {
  return {
    addBookmark: overrides.addBookmark ?? jest.fn().mockResolvedValue(undefined),
    removeBookmark:
      overrides.removeBookmark ?? jest.fn().mockResolvedValue(undefined),
  };
}

function action(
  overrides: Partial<QueuedBookmarkAction> = {}
): QueuedBookmarkAction {
  return {
    id: overrides.id ?? 'bmq_1',
    type: overrides.type ?? 'add',
    userId: overrides.userId ?? 'u1',
    discussionId: overrides.discussionId ?? 't-1',
    queuedAt: overrides.queuedAt ?? 1,
  };
}

describe('bookmarkQueue', () => {
  it('persists queued actions in order', async () => {
    await enqueueBookmarkAction({ type: 'add', userId: 'u1', discussionId: 't-1' });
    await enqueueBookmarkAction({
      type: 'remove',
      userId: 'u1',
      discussionId: 't-2',
    });

    const queued = await getQueuedBookmarkActions();

    expect(queued.map((a) => [a.type, a.discussionId])).toEqual([
      ['add', 't-1'],
      ['remove', 't-2'],
    ]);
    expect(queued[0]?.id).toEqual(expect.any(String));
  });

  it('removes a single queued action by id', async () => {
    const first = await enqueueBookmarkAction({
      type: 'add',
      userId: 'u1',
      discussionId: 't-1',
    });
    await enqueueBookmarkAction({ type: 'add', userId: 'u1', discussionId: 't-2' });

    await removeQueuedBookmarkAction(first.id);

    const queued = await getQueuedBookmarkActions();
    expect(queued.map((a) => a.discussionId)).toEqual(['t-2']);
  });

  it('clears the queue', async () => {
    await enqueueBookmarkAction({ type: 'add', userId: 'u1', discussionId: 't-1' });
    await clearBookmarkQueue();
    await expect(getQueuedBookmarkActions()).resolves.toEqual([]);
  });

  it('dedupes to the last write per user + discussion', () => {
    const deduped = dedupeBookmarkActions([
      action({ id: 'a', type: 'add', discussionId: 't-1' }),
      action({ id: 'b', type: 'add', discussionId: 't-2' }),
      action({ id: 'c', type: 'remove', discussionId: 't-1' }),
    ]);

    expect(deduped.map((a) => [a.id, a.type, a.discussionId])).toEqual([
      ['c', 'remove', 't-1'],
      ['b', 'add', 't-2'],
    ]);
  });

  it('replays queued work and clears the queue on success', async () => {
    await enqueueBookmarkAction({ type: 'add', userId: 'u1', discussionId: 't-1' });
    await enqueueBookmarkAction({
      type: 'remove',
      userId: 'u1',
      discussionId: 't-2',
    });
    const client = makeClient();

    const result = await syncQueuedBookmarkActions(client);

    expect(client.addBookmark).toHaveBeenCalledWith('u1', 't-1');
    expect(client.removeBookmark).toHaveBeenCalledWith('u1', 't-2');
    expect(result.synced).toBe(2);
    expect(result.remaining).toEqual([]);
    await expect(getQueuedBookmarkActions()).resolves.toEqual([]);
  });

  it('keeps actions that fail with a non-404 error queued', async () => {
    await enqueueBookmarkAction({ type: 'add', userId: 'u1', discussionId: 't-1' });
    await enqueueBookmarkAction({ type: 'add', userId: 'u1', discussionId: 't-2' });
    const client = makeClient({
      addBookmark: jest
        .fn()
        .mockRejectedValueOnce(new Error('server exploded'))
        .mockResolvedValueOnce(undefined),
    });

    const result = await syncQueuedBookmarkActions(client);

    expect(result.synced).toBe(1);
    expect(result.remaining.map((a) => a.discussionId)).toEqual(['t-1']);
    const queued = await getQueuedBookmarkActions();
    expect(queued.map((a) => a.discussionId)).toEqual(['t-1']);
  });

  it('treats a 404 on remove as already synced', async () => {
    await enqueueBookmarkAction({
      type: 'remove',
      userId: 'u1',
      discussionId: 't-1',
    });
    const client = makeClient({
      removeBookmark: jest
        .fn()
        .mockRejectedValue(new ApiError('Not found', 404, null)),
    });

    const result = await syncQueuedBookmarkActions(client);

    expect(result.synced).toBe(1);
    expect(result.remaining).toEqual([]);
  });

  it('drops a corrupt queue payload', async () => {
    await AsyncStorage.setItem(BOOKMARK_QUEUE_KEY, 'not-json');

    await expect(getQueuedBookmarkActions()).resolves.toEqual([]);
  });
});
