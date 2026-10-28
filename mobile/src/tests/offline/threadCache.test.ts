import AsyncStorage from '@react-native-async-storage/async-storage';

import { createForumThreadFactory } from '@/mock/factories';
import {
  clearThreadCache,
  isCacheFresh,
  readThreadCache,
  THREAD_CACHE_KEY,
  THREAD_CACHE_TTL_MS,
  writeThreadCache,
} from '@/offline/threadCache';

const makeThread = createForumThreadFactory(1);
const THREADS = [makeThread(0, ['cat-1'], ['jest']), makeThread(1, ['cat-1'], ['react'])];

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);

describe('threadCache', () => {
  it('misses when nothing has been cached', async () => {
    await expect(readThreadCache(NOW)).resolves.toBeNull();
  });

  it('round-trips threads written within the TTL', async () => {
    await writeThreadCache(THREADS, NOW);

    const entry = await readThreadCache(NOW + 60_000);

    expect(entry?.threads).toEqual(THREADS);
    expect(entry?.cachedAt).toBe(NOW);
  });

  it('treats exactly-15-minute-old data as expired and purges it', async () => {
    await writeThreadCache(THREADS, NOW);

    await expect(readThreadCache(NOW + THREAD_CACHE_TTL_MS)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(THREAD_CACHE_KEY)).resolves.toBeNull();
  });

  it('keeps data fresh one millisecond before the TTL boundary', async () => {
    await writeThreadCache(THREADS, NOW);

    await expect(
      readThreadCache(NOW + THREAD_CACHE_TTL_MS - 1)
    ).resolves.not.toBeNull();
  });

  it('ignores a malformed cache entry', async () => {
    await AsyncStorage.setItem(THREAD_CACHE_KEY, 'not-json');
    await expect(readThreadCache(NOW)).resolves.toBeNull();
  });

  it('isCacheFresh only accepts future-or-equal timestamps inside the window', () => {
    expect(isCacheFresh(NOW, NOW)).toBe(true);
    expect(isCacheFresh(NOW, NOW + THREAD_CACHE_TTL_MS - 1)).toBe(true);
    expect(isCacheFresh(NOW, NOW + THREAD_CACHE_TTL_MS)).toBe(false);
    expect(isCacheFresh(NOW, NOW - 1)).toBe(false);
  });

  it('clears the cache on demand', async () => {
    await writeThreadCache(THREADS, NOW);
    await clearThreadCache();
    await expect(AsyncStorage.getItem(THREAD_CACHE_KEY)).resolves.toBeNull();
  });
});
