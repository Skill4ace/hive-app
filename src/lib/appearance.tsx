import Storage from 'expo-sqlite/kv-store';
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

export type AppearancePreference = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'hive.appearance.v1';

function readStoredPreference(): AppearancePreference {
  try {
    const stored = Storage.getItemSync?.(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Synchronous read is just a launch nicety; fall back to following the OS.
  }
  return 'system';
}

type AppearanceContextValue = {
  /** What the user picked: 'system' follows the OS, otherwise it overrides it. */
  preference: AppearancePreference;
  /** The effective scheme everything renders with. */
  scheme: ColorScheme;
  setPreference: (next: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  // Read synchronously on first render so a returning user who picked Dark on a
  // Light phone doesn't see a Light → Dark flash while async storage loads.
  const [preference, setPreferenceState] = useState<AppearancePreference>(readStoredPreference);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    Storage.setItem(STORAGE_KEY, next).catch(() => {
      // Non-fatal: the choice still applies for this session.
    });
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<AppearanceContextValue>(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference],
  );

  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

export function useAppearance() {
  const context = use(AppearanceContext);

  if (!context) {
    throw new Error('useAppearance must be used inside AppearanceProvider');
  }

  return context;
}

export function useAppColorScheme(): ColorScheme {
  return useAppearance().scheme;
}
