import { createContext, useContext, useMemo, useState } from 'react';

import type { LearningApiClient } from '@/api/client';
import { getApiClient } from '@/api';

/**
 * Provides the active data source to the tree.
 *
 * Screens depend on this context rather than importing `getApiClient()`
 * directly, which lets tests inject a stub client without module mocking.
 */
const ApiClientContext = createContext<LearningApiClient>(getApiClient());

export function ApiClientProvider({
  client,
  children,
}: {
  client?: LearningApiClient;
  children: React.ReactNode;
}) {
  const [fallback] = useState<LearningApiClient>(() => getApiClient());
  const value = useMemo(() => client ?? fallback, [client, fallback]);

  return (
    <ApiClientContext.Provider value={value}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient(): LearningApiClient {
  return useContext(ApiClientContext);
}

export default ApiClientProvider;
