interface CacheEntry {
  data: any;
  etag: string;
  expiry: number;
}

const clientMemoryCache: Record<string, CacheEntry> = {};

export const getCacheDuration = (url: string): number => {
  if (url.includes('/courses')) return 5 * 60 * 1000;       // 5 minutes
  if (url.includes('/threads')) return 2 * 60 * 1000;       // 2 minutes
  if (url.includes('/notifications')) return 30 * 1000;     // 30 seconds
  if (url.includes('/analytics')) return 10 * 60 * 1000;    // 10 minutes
  return 0; 
};

export const getLocalCache = (url: string) => {
  const cached = clientMemoryCache[url];
  if (!cached) return null;

  const isExpired = Date.now() > cached.expiry;
  return { cachedData: cached.data, etag: cached.etag, isExpired };
};

export const setLocalCache = (url: string, data: any, etag: string, maxAgeMs: number) => {
  if (maxAgeMs <= 0) return;
  clientMemoryCache[url] = {
    data,
    etag,
    expiry: Date.now() + maxAgeMs,
  };
};
