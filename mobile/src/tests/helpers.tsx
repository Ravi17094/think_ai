import { act, render, type RenderOptions } from '@testing-library/react-native';

import type { LearningApiClient } from '@/api/client';
import { ApiClientProvider } from '@/hooks/useApiClient';
import type { RootStackParamList } from '@/navigation/types';

type RouteName = keyof RootStackParamList;

export interface MockNavigation {
  navigate: jest.Mock;
  goBack: jest.Mock;
  push: jest.Mock;
  replace: jest.Mock;
  setOptions: jest.Mock;
  addListener: jest.Mock;
  isFocused: jest.Mock;
  canGoBack: jest.Mock;
}

/** Minimal `NavigationProp` stand-in for screen unit tests. */
export function createMockNavigation(): MockNavigation {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
  };
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  client?: LearningApiClient;
  navigation?: MockNavigation;
  route?: Partial<{ params: Record<string, unknown> }> & { name?: RouteName };
}

/**
 * Wraps `ui` in the API client provider so screens/hooks resolve the injected
 * client through context instead of module mocking.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { client, ...options }: RenderWithProvidersOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApiClientProvider client={client}>{children}</ApiClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Builds a screen element with the navigation + route props React Navigation
 * would inject, keeping tests free of boilerplate.
 */
export function renderScreen<Name extends RouteName>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>,
  options: {
    name: Name;
    client?: LearningApiClient;
    navigation?: MockNavigation;
    params?: RootStackParamList[Name];
  }
) {
  const navigation = options.navigation ?? createMockNavigation();
  const result = renderWithProviders(
    <Component
      navigation={navigation}
      route={{ key: `${options.name}-route`, name: options.name, params: options.params }}
    />,
    { client: options.client }
  );

  return { ...result, navigation };
}

/** Resolves after all pending microtasks + effects have flushed. */
export async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Flushes timers and the microtask queue deterministically.
 *
 * `waitFor` polling is unreliable under this project's globally installed fake
 * timers: the retry loop can spin without draining microtasks, so a
 * promise-driven state update never lands and the test times out. Tests that
 * wait for a request to settle use this instead of polling.
 *
 * `advanceMs` moves the clock forward on every round, which is how tests let a
 * mock client's simulated latency expire.
 */
export async function flushAllPendingWork(rounds = 5, advanceMs = 0): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(advanceMs);
      await Promise.resolve();
    });
  }
}
