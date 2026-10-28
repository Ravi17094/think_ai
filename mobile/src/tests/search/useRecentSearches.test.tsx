import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_KEY,
  useRecentSearches,
} from '@/hooks/useRecentSearches';

describe('useRecentSearches', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('hydrates an empty list when storage is empty', async () => {
    const { result } = renderHook(() => useRecentSearches());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.recent).toEqual([]);
  });

  it('hydrates persisted searches', async () => {
    await AsyncStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(['react native', 'typescript'])
    );

    const { result } = renderHook(() => useRecentSearches());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.recent).toEqual(['react native', 'typescript']);
  });

  it('recovers from corrupted storage instead of crashing', async () => {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, '{not json');

    const { result } = renderHook(() => useRecentSearches());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.recent).toEqual([]);
  });

  it('sanitises hydrated values by dropping blanks, non-strings and duplicates', async () => {
    await AsyncStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(['React', '  ', 42, 'react', 'TypeScript'])
    );

    const { result } = renderHook(() => useRecentSearches());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.recent).toEqual(['React', 'TypeScript']);
  });

  it('prepends a new term and persists it', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.addRecentSearch('react native');
    });

    expect(result.current.recent).toEqual(['react native']);
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(RECENT_SEARCHES_KEY)).toBe(
        JSON.stringify(['react native'])
      )
    );
  });

  it('moves a repeated term to the front instead of duplicating it', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.addRecentSearch('react native');
      result.current.addRecentSearch('typescript');
    });
    act(() => {
      result.current.addRecentSearch('REACT NATIVE');
    });

    expect(result.current.recent).toEqual(['REACT NATIVE', 'typescript']);
  });

  it('ignores blank submissions', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.addRecentSearch('   ');
    });

    expect(result.current.recent).toEqual([]);
  });

  it('caps the list at MAX_RECENT_SEARCHES', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    for (let i = 0; i < MAX_RECENT_SEARCHES + 4; i += 1) {
      act(() => {
        result.current.addRecentSearch(`term-${i}`);
      });
    }

    expect(result.current.recent).toHaveLength(MAX_RECENT_SEARCHES);
    expect(result.current.recent[0]).toBe(`term-${MAX_RECENT_SEARCHES + 3}`);
  });

  it('removes a single term case-insensitively', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.addRecentSearch('react native');
    });
    act(() => {
      result.current.addRecentSearch('typescript');
    });
    act(() => {
      result.current.removeRecentSearch('REACT NATIVE');
    });

    expect(result.current.recent).toEqual(['typescript']);
  });

  it('clears every term and drops the storage entry', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.addRecentSearch('react native');
    });
    act(() => {
      result.current.clearRecentSearches();
    });

    expect(result.current.recent).toEqual([]);
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull()
    );
  });
});