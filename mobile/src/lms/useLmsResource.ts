import { useCallback, useEffect, useRef, useState } from "react";
export function useLmsResource<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const value = await fetcher();
      if (run === generation.current) setData(value);
    } catch (e) {
      if (run === generation.current)
        setError(e instanceof Error ? e.message : "Unable to load.");
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, [fetcher]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  return { data, error, loading, refresh, setData };
}
