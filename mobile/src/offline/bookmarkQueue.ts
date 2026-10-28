import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '@/api/http';

/**
 * Durable queue of bookmark mutations made while offline.
 *
 * The queue is an ordered log persisted in AsyncStorage. When connectivity
 * returns, `syncQueuedBookmarkActions` replays it against the API and keeps any
 * action that still fails, so nothing is silently dropped.
 */

export type BookmarkActionType = 'add' | 'remove';

export interface QueuedBookmarkAction {
  id: string;
  type: BookmarkActionType;
  userId: string;
  discussionId: string;
  queuedAt: number;
}

export const BOOKMARK_QUEUE_KEY = 'thinkz_bookmark_queue_v1';

/** Minimal client surface the sync needs — keeps the module easy to fake. */
export interface BookmarkSyncClient {
  addBookmark(userId: string, discussionId: string): Promise<void>;
  removeBookmark(userId: string, discussionId: string): Promise<void>;
}

export interface BookmarkActionInput {
  type: BookmarkActionType;
  userId: string;
  discussionId: string;
}

let sequence = 0;

function createActionId(): string {
  sequence += 1;
  return `bmq_${Date.now()}_${sequence}`;
}

async function readRaw(): Promise<QueuedBookmarkAction[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARK_QUEUE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedBookmarkAction[]) : [];
  } catch {
    return [];
  }
}

async function persist(actions: QueuedBookmarkAction[]): Promise<void> {
  try {
    if (actions.length === 0) {
      await AsyncStorage.removeItem(BOOKMARK_QUEUE_KEY);
    } else {
      await AsyncStorage.setItem(BOOKMARK_QUEUE_KEY, JSON.stringify(actions));
    }
  } catch {
    // Storage failures are non-fatal for the in-memory flow.
  }
}

export async function getQueuedBookmarkActions(): Promise<QueuedBookmarkAction[]> {
  return readRaw();
}

export async function enqueueBookmarkAction(
  input: BookmarkActionInput
): Promise<QueuedBookmarkAction> {
  const action: QueuedBookmarkAction = {
    id: createActionId(),
    type: input.type,
    userId: input.userId,
    discussionId: input.discussionId,
    queuedAt: Date.now(),
  };
  const next = [...(await readRaw()), action];
  await persist(next);
  return action;
}

export async function removeQueuedBookmarkAction(id: string): Promise<void> {
  const next = (await readRaw()).filter((action) => action.id !== id);
  await persist(next);
}

export async function clearBookmarkQueue(): Promise<void> {
  await persist([]);
}

/**
 * Collapses an ordered action log to the last write per discussion.
 *
 * If a user bookmarks then un-bookmarks the same thread while offline, only the
 * final intent (`remove`) should reach the server.
 */
export function dedupeBookmarkActions(
  actions: QueuedBookmarkAction[]
): QueuedBookmarkAction[] {
  const byDiscussion = new Map<string, QueuedBookmarkAction>();
  for (const action of actions) {
    byDiscussion.set(`${action.userId}:${action.discussionId}`, action);
  }
  // Preserve the order of each discussion's *final* action.
  const seen = new Set<string>();
  const result: QueuedBookmarkAction[] = [];
  for (const action of actions) {
    const key = `${action.userId}:${action.discussionId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const last = byDiscussion.get(key);
    if (last) {
      result.push(last);
    }
  }
  return result;
}

/**
 * Replays the queued actions in order.
 *
 * A `404` on `remove` means the bookmark is already gone upstream, so it counts
 * as synced. Any other failure keeps the action queued for the next reconnect.
 */
export async function syncQueuedBookmarkActions(
  client: BookmarkSyncClient
): Promise<{ synced: number; remaining: QueuedBookmarkAction[] }> {
  const actions = dedupeBookmarkActions(await readRaw());
  let synced = 0;
  const remaining: QueuedBookmarkAction[] = [];

  for (const action of actions) {
    try {
      if (action.type === 'add') {
        await client.addBookmark(action.userId, action.discussionId);
      } else {
        await client.removeBookmark(action.userId, action.discussionId);
      }
      synced += 1;
    } catch (error) {
      if (isAlreadyGone(error)) {
        synced += 1;
      } else {
        remaining.push(action);
      }
    }
  }

  await persist(remaining);
  return { synced, remaining };
}

function isAlreadyGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
