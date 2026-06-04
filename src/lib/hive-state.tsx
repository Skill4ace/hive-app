import Storage from 'expo-sqlite/kv-store';
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type MoveInPreference = 'Aug' | 'Sep' | 'Oct' | 'Flexible';
export type CommuteMode = 'walk' | 'bike' | 'drive' | 'transit';
export type ParkingPreference = 'needed' | 'nice' | 'none';
export type ListingDecision = 'liked' | 'passed';

export type SearchPreferences = {
  username: string;
  campusSlug: string;
  campusName: string;
  budgetMin: number;
  budgetMax: number;
  moveIn: MoveInPreference;
  distanceMiles: number;
  bedrooms: number;
  bathrooms: number;
  commuteMode: CommuteMode;
  parking: ParkingPreference;
};

export type ListingDecisionRecord = {
  decision: ListingDecision;
  decidedAt: string;
  score?: number;
};

type DecisionHistoryItem = {
  listingId: string;
  previous?: ListingDecisionRecord;
};

type PersistedHiveState = {
  preferences: SearchPreferences;
  decisions: Record<string, ListingDecisionRecord>;
  history: DecisionHistoryItem[];
};

type HiveAppStateContextValue = PersistedHiveState & {
  hydrated: boolean;
  likedIds: string[];
  passedIds: string[];
  updatePreferences: (next: Partial<SearchPreferences>) => Promise<void>;
  recordDecision: (listingId: string, decision: ListingDecision, score?: number) => void;
  clearDecision: (listingId: string) => void;
  undoDecision: () => void;
  resetDecisions: () => void;
  clearAllLocalData: () => Promise<void>;
};

const STORAGE_KEY = 'hive.local-state.v1';
const HISTORY_LIMIT = 100;

export const defaultSearchPreferences: SearchPreferences = {
  username: '',
  campusSlug: 'ucla',
  campusName: 'UCLA',
  budgetMin: 600,
  budgetMax: 1550,
  moveIn: 'Aug',
  distanceMiles: 1.25,
  bedrooms: 3,
  bathrooms: 1,
  commuteMode: 'walk',
  parking: 'nice',
};

const emptyState: PersistedHiveState = {
  preferences: defaultSearchPreferences,
  decisions: {},
  history: [],
};

const HiveAppStateContext = createContext<HiveAppStateContextValue | null>(null);

export function HiveAppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [preferences, setPreferences] = useState<SearchPreferences>(defaultSearchPreferences);
  const [decisions, setDecisions] = useState<Record<string, ListingDecisionRecord>>({});
  const [history, setHistory] = useState<DecisionHistoryItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const stored = await Storage.getItem(STORAGE_KEY);
        if (!mounted) return;

        if (stored) {
          const parsed = normalizePersistedState(JSON.parse(stored));
          setPreferences(parsed.preferences);
          setDecisions(parsed.decisions);
          setHistory(parsed.history);
        }
      } catch (error) {
        console.warn('Unable to load Hive local state', error);
      } finally {
        if (mounted) setHydrated(true);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload: PersistedHiveState = {
      preferences,
      decisions,
      history,
    };

    persistHiveState(payload).catch((error) => {
      console.warn('Unable to save Hive local state', error);
    });
  }, [decisions, history, hydrated, preferences]);

  const updatePreferences = useCallback(async (next: Partial<SearchPreferences>) => {
    const nextPreferences = {
      ...preferences,
      ...next,
      campusSlug: next.campusSlug ?? preferences.campusSlug,
      campusName: next.campusName ?? preferences.campusName,
    };

    setPreferences(nextPreferences);
    await persistHiveState({
      preferences: nextPreferences,
      decisions,
      history,
    });
  }, [decisions, history, preferences]);

  const recordDecision = useCallback((listingId: string, decision: ListingDecision, score?: number) => {
    const decidedAt = new Date().toISOString();

    setDecisions((current) => {
      const previous = current[listingId];
      setHistory((items) => [{ listingId, previous }, ...items].slice(0, HISTORY_LIMIT));

      return {
        ...current,
        [listingId]: {
          decision,
          decidedAt,
          score,
        },
      };
    });
  }, []);

  const clearDecision = useCallback((listingId: string) => {
    setDecisions((current) => {
      const next = { ...current };
      delete next[listingId];
      return next;
    });
  }, []);

  const undoDecision = useCallback(() => {
    setHistory((items) => {
      const [latest, ...rest] = items;
      if (!latest) return items;

      setDecisions((current) => {
        const next = { ...current };
        if (latest.previous) {
          next[latest.listingId] = latest.previous;
        } else {
          delete next[latest.listingId];
        }
        return next;
      });

      return rest;
    });
  }, []);

  const resetDecisions = useCallback(() => {
    setDecisions({});
    setHistory([]);
  }, []);

  const clearAllLocalData = useCallback(async () => {
    setPreferences(defaultSearchPreferences);
    setDecisions({});
    setHistory([]);
    try {
      await Storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Unable to clear Hive local state', error);
    }
  }, []);

  const value = useMemo<HiveAppStateContextValue>(() => {
    const entries = Object.entries(decisions);

    return {
      hydrated,
      preferences,
      decisions,
      history,
      likedIds: entries.filter(([, record]) => record.decision === 'liked').map(([id]) => id),
      passedIds: entries.filter(([, record]) => record.decision === 'passed').map(([id]) => id),
      updatePreferences,
      recordDecision,
      clearDecision,
      undoDecision,
      resetDecisions,
      clearAllLocalData,
    };
  }, [
    clearAllLocalData,
    clearDecision,
    decisions,
    history,
    hydrated,
    preferences,
    recordDecision,
    resetDecisions,
    undoDecision,
    updatePreferences,
  ]);

  return <HiveAppStateContext value={value}>{children}</HiveAppStateContext>;
}

export function useHiveAppState() {
  const context = use(HiveAppStateContext);

  if (!context) {
    throw new Error('useHiveAppState must be used inside HiveAppStateProvider');
  }

  return context;
}

function normalizePersistedState(value: Partial<PersistedHiveState> | null): PersistedHiveState {
  if (!value || typeof value !== 'object') return emptyState;

  return {
    preferences: {
      ...defaultSearchPreferences,
      ...(value.preferences ?? {}),
      username: normalizeUsername(value.preferences?.username),
      campusSlug: normalizeCampusSlug(value.preferences?.campusSlug ?? value.preferences?.campusName),
      campusName: (value.preferences?.campusName || defaultSearchPreferences.campusName).toUpperCase(),
    },
    decisions: value.decisions && typeof value.decisions === 'object' ? value.decisions : {},
    history: Array.isArray(value.history) ? value.history.slice(0, HISTORY_LIMIT) : [],
  };
}

function persistHiveState(payload: PersistedHiveState) {
  return Storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function normalizeUsername(value?: string) {
  return (value ?? '').trim();
}

function normalizeCampusSlug(value?: string) {
  const normalized = String(value || defaultSearchPreferences.campusSlug)
    .trim()
    .toLowerCase();

  return normalized || defaultSearchPreferences.campusSlug;
}
