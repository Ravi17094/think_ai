import type { MockApiClient } from '@/api/mockClient';
import type { LearningApiClient } from '@/api/client';
import { createMockApiClient } from '@/api/mockClient';

export type CommunityOverrides = Partial<LearningApiClient>;

/**
 * Test double for Pages 6–10: the real mock client (Page 1–5 fixtures) with
 * any community method replaced by a `jest.fn`. Never touches the network.
 */
export function createCommunityTestClient(
  overrides: CommunityOverrides = {}
): MockApiClient {
  return { ...createMockApiClient({ latencyMs: 0 }), ...overrides };
}
