import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// A small stale-while-revalidate cache. Screens render the last known data at once when
// revisited and refresh in the background, which matters on slow connections.

type Entry = { data?: unknown; error?: unknown; promise?: Promise<void> };

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();
const fetchers = new Map<string, () => Promise<unknown>>();

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, listener: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => {
    listeners.get(key)!.delete(listener);
  };
}

function load(key: string): Promise<void> {
  const entry = cache.get(key) ?? {};
  if (entry.promise) return entry.promise;
  const fetcher = fetchers.get(key);
  if (!fetcher) return Promise.resolve();
  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data });
      notify(key);
    })
    .catch((error) => {
      cache.set(key, { data: cache.get(key)?.data, error });
      notify(key);
    });
  cache.set(key, { data: entry.data, promise });
  notify(key);
  return promise;
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const getSnapshot = useCallback(() => (key ? cache.get(key) : undefined), [key]);
  const subscribeKey = useCallback((l: () => void) => (key ? subscribe(key, l) : () => {}), [key]);
  const entry = useSyncExternalStore(subscribeKey, getSnapshot);

  useEffect(() => {
    if (!key) return;
    fetchers.set(key, () => fetcherRef.current());
    void load(key);
  }, [key]);

  const refetch = useCallback(() => (key ? load(key) : Promise.resolve()), [key]);

  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    isLoading: key !== null && entry?.data === undefined && !entry?.error,
    isFetching: Boolean(entry?.promise),
    refetch,
  };
}

// Puts fresh data straight into the cache, for writes that already return the new row.
export function setQueryData<T>(key: string, data: T) {
  cache.set(key, { data });
  notify(key);
}

// Refetches every mounted query whose key starts with a prefix and drops the rest.
export function invalidate(...prefixes: string[]) {
  for (const key of [...cache.keys()]) {
    if (!prefixes.some((p) => key.startsWith(p))) continue;
    if ((listeners.get(key)?.size ?? 0) > 0) {
      const entry = cache.get(key);
      if (entry) cache.set(key, { data: entry.data });
      void load(key);
    } else {
      cache.delete(key);
    }
  }
}

export function clearQueryCache() {
  cache.clear();
}
