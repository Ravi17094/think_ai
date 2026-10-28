import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoteDirection } from '@/types/community';

const STORAGE_KEY = 'thinkz.community.replyVotes';

/**
 * Device-local vote state for replies.
 *
 * The backend has no comment-vote endpoint (confirmed: `Comment.serialize()`
 * exposes no votes), so a reply vote is a local preference — optimistic in the
 * UI and persisted to AsyncStorage, with a rollback if the write fails.
 */
export function useReplyVotes() {
  const votesRef = useRef<Record<string, VoteDirection>>({});
  const [votes, setVotes] = useState<Record<string, VoteDirection>>({});

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) {
          return;
        }
        try {
          const parsed = JSON.parse(raw) as Record<string, VoteDirection>;
          votesRef.current = parsed;
          setVotes(parsed);
        } catch {
          // Corrupt payload — start from an empty vote map.
        }
      })
      .catch(() => {
        // Unreadable storage — start from an empty vote map.
      });
    return () => {
      active = false;
    };
  }, []);

  const vote = useCallback(
    async (replyId: string, direction: VoteDirection): Promise<boolean> => {
      const before = votesRef.current;
      const previous = before[replyId] ?? 'none';
      const next: VoteDirection = previous === direction ? 'none' : direction;

      const optimistic: Record<string, VoteDirection> = { ...before };
      if (next === 'none') {
        delete optimistic[replyId];
      } else {
        optimistic[replyId] = next;
      }

      // Optimistic update.
      votesRef.current = optimistic;
      setVotes(optimistic);

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(optimistic));
        return true;
      } catch {
        // Persist failed — roll back to the previous vote map.
        votesRef.current = before;
        setVotes(before);
        return false;
      }
    },
    []
  );

  return { votes, vote };
}

export default useReplyVotes;
