import type { LearningApiClient } from './client';
import { createMockApiClient } from './mockClient';

export type { LearningApiClient } from './client';
export type { CommunityApiClient, CommunityApiMethod } from './client';
export { createMockApiClient } from './mockClient';
export type { MockApiClient, MockApiOptions } from './mockClient';
export { createCommunityClient } from './communityClient';
export { API_BASE_URL, ApiError } from './http';

/**
 * The single active data source for the app.
 *
 * The OpenAPI contract is a cross-team dependency (due 11:00 AM). Until it
 * lands, the mock client backs every hook so the five pages are fully runnable
 * and testable. To go live, build the generated client against the published
 * spec and replace the assignment below — screens, components and hooks need
 * no changes because they only ever depend on `LearningApiClient`.
 */
let activeClient: LearningApiClient = createMockApiClient();

export function getApiClient(): LearningApiClient {
  return activeClient;
}

/** Escape hatch used by tests and Storybook-style previews. */
export function setApiClient(client: LearningApiClient): void {
  activeClient = client;
}

export function useMockApi(): LearningApiClient {
  return activeClient;
}
