import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { ErrorBoundary } from '@/components/common';
import {
  __resetErrorReporterForTests,
  setErrorReporter,
  type ErrorReport,
} from '@/utils/errorReporting';

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <Text>Recovered</Text>;
}

describe('ErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance;
  let reports: ErrorReport[];

  beforeEach(() => {
    shouldThrow = true;
    reports = [];
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    setErrorReporter((report) => reports.push(report));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    __resetErrorReporterForTests();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeTruthy();
    expect(reports).toHaveLength(0);
  });

  it('catches a crash and shows the default fallback', () => {
    render(
      <ErrorBoundary context="forum">
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeTruthy();
    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent('boom');
    expect(reports).toHaveLength(1);
    expect(reports[0]!.context).toBe('forum');
  });

  it('recovers when the retry action is pressed', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByTestId('error-boundary-retry'));

    expect(screen.getByText('Recovered')).toBeTruthy();
    expect(screen.queryByTestId('error-boundary')).toBeNull();
  });

  it('supports a custom fallback that receives the error and a reset', () => {
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <Pressable onPress={reset} testID="custom-fallback">
            <Text>{`Failed: ${error.message}`}</Text>
          </Pressable>
        )}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Failed: boom')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByTestId('custom-fallback'));

    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('invokes onError alongside the report', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('auto-resets when resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['thread-1']}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeTruthy();

    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKeys={['thread-2']}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered')).toBeTruthy();
  });
});
