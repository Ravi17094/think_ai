import { useCallback, useEffect, useState } from 'react';

import { toErrorMessage } from './useAsyncResource';
import { useApiClient } from './useApiClient';
import type { ForumCategory } from '@/types';
import type { CreateDiscussionResult } from '@/types/community';

export interface CreateThreadFormInput {
  title: string;
  body: string;
  categoryId: string;
  tags: string[];
}

/**
 * Page 7 — Create Post data source.
 *
 * Loads the category list and tag taxonomy up front (so the form renders
 * pickable chips), then creates the discussion through the real
 * `POST /api/discussions` endpoint.
 */
export function useCreateThread() {
  const client = useApiClient();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextCategories, nextTags] = await Promise.all([
        client.fetchDiscussionCategories(),
        client.fetchAllTags(),
      ]);
      setCategories(nextCategories);
      setAvailableTags(nextTags);
    } catch (cause) {
      setLoadError(toErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const createThread = useCallback(
    async (input: CreateThreadFormInput): Promise<CreateDiscussionResult> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        return await client.createDiscussion(input);
      } catch (cause) {
        setSubmitError(toErrorMessage(cause));
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [client]
  );

  return {
    categories,
    availableTags,
    isLoading,
    hasError: loadError !== null,
    loadError,
    isSubmitting,
    submitError,
    clearSubmitError: useCallback(() => setSubmitError(null), []),
    createThread,
    reload: load,
  };
}

export default useCreateThread;
