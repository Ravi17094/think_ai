import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/hooks/useAsyncResource';
import { SEARCH_DEBOUNCE_MS } from '@/theme/tokens';

describe('useDebouncedValue', () => {
  it('starts with the initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('react'));
    expect(result.current).toBe('react');
  });

  it('does not emit the new value immediately', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    expect(result.current).toBe('a');
  });

  it('emits the new value after the 300 ms window', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'react' });

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('react');
  });

  it('collapses a burst of keystrokes into a single emission', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: '' } }
    );

    ['r', 're', 'rea', 'reac', 'react'].forEach((value) => {
      rerender({ value });
      act(() => {
        jest.advanceTimersByTime(50);
      });
    });

    expect(result.current).toBe('');

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(result.current).toBe('react');
  });

  it('cancels the pending timer when the value changes again', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // 'ab' is superseded before its window elapses.
    rerender({ value: 'abc' });
    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(result.current).toBe('abc');
  });

  it('passes the value straight through when the delay is zero', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 0),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('b');
  });
});
