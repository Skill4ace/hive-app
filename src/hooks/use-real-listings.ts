import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchListingDetail,
  fetchListingsByIds,
  fetchRealListings,
  type ListingDetail,
} from '@/data/real-listings';
import { useHiveAppState } from '@/lib/hive-state';

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useRealListings(): AsyncState<Awaited<ReturnType<typeof fetchRealListings>>> {
  const { preferences, hydrated } = useHiveAppState();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRealListings>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const preferencesKey = useMemo(() => JSON.stringify(preferences), [preferences]);

  useEffect(() => {
    if (!hydrated) return;

    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

    fetchRealListings(preferences)
      .then((listings) => {
        if (!mounted) return;
        setData(listings);
      })
      .catch((nextError) => {
        if (!mounted) return;
        setError(readErrorMessage(nextError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
    // preferencesKey intentionally captures every preference field without a
    // brittle hand-maintained dependency list.
  }, [hydrated, preferences, preferencesKey, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  return { data, loading: loading || !hydrated, error, refresh };
}

export function useSavedRealListings(ids: string[]): AsyncState<Awaited<ReturnType<typeof fetchListingsByIds>>> {
  const { preferences, hydrated } = useHiveAppState();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchListingsByIds>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const idsKey = ids.join('|');
  const preferencesKey = useMemo(() => JSON.stringify(preferences), [preferences]);

  useEffect(() => {
    if (!hydrated) return;

    if (ids.length === 0) {
      Promise.resolve().then(() => {
        setData([]);
        setError(null);
        setLoading(false);
      });
      return;
    }

    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

    fetchListingsByIds(ids, preferences)
      .then((listings) => {
        if (!mounted) return;
        setData(listings);
      })
      .catch((nextError) => {
        if (!mounted) return;
        setError(readErrorMessage(nextError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [hydrated, ids, idsKey, preferences, preferencesKey, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  return { data, loading: loading || !hydrated, error, refresh };
}

export function useRealListingDetail(id?: string): AsyncState<ListingDetail | null> {
  const { preferences, hydrated } = useHiveAppState();
  const [data, setData] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const preferencesKey = useMemo(() => JSON.stringify(preferences), [preferences]);

  useEffect(() => {
    if (!hydrated || !id) return;

    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

    fetchListingDetail(id, preferences)
      .then((detail) => {
        if (!mounted) return;
        setData(detail);
      })
      .catch((nextError) => {
        if (!mounted) return;
        setError(readErrorMessage(nextError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [hydrated, id, preferences, preferencesKey, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  return { data, loading: loading || !hydrated, error, refresh };
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
