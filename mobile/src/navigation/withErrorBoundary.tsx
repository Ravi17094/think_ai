import type { ComponentType } from 'react';

import { ErrorBoundary } from '@/components/common';

interface RouteProps {
  route?: { key?: string };
}

/**
 * Wraps a route component in its own ErrorBoundary.
 *
 * Per-screen isolation means a crash in one module (e.g. a malformed forum
 * reply) renders the shared retry fallback inside that screen while the tab
 * bar and the rest of the navigator stay alive. `resetKeys` is the route key so
 * navigating to another thread/assessment clears the error automatically.
 */
export function withErrorBoundary<Props extends RouteProps>(
  Screen: ComponentType<Props>,
  context: string
): ComponentType<Props> {
  function ScreenWithBoundary(props: Props) {
    return (
      <ErrorBoundary context={context} resetKeys={[props.route?.key]}>
        <Screen {...props} />
      </ErrorBoundary>
    );
  }
  ScreenWithBoundary.displayName = `withErrorBoundary(${
    Screen.displayName ?? Screen.name ?? context
  })`;
  return ScreenWithBoundary;
}

export default withErrorBoundary;
