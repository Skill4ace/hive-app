import { createContext, createElement, type ReactNode, use } from 'react';

import { Colors, type ThemeColor } from '@/constants/theme';
import { useHiveAppState } from '@/lib/hive-state';

export type School = {
  /** Matches the `campuses.slug` column in Supabase. */
  slug: string;
  /** Friendly name shown in the picker. */
  name: string;
  /** Short label used in compact UI (and stored as campusName). */
  shortName: string;
  /** Light-mode primary — the school's saturated brand color. */
  accent: string;
  /** Dark-mode primary — a lighter tint that reads on a dark background. */
  accentDark: string;
  /** Campus center, used to frame the map. */
  latitude: number;
  longitude: number;
};

// The campuses that currently have listing data in Supabase. Colors are the
// schools' brand primaries (not stored in the DB), used to drive the accent.
export const SCHOOLS: School[] = [
  { slug: 'ucla', name: 'UC Los Angeles', shortName: 'UCLA', accent: '#2774AE', accentDark: '#6CA6DC', latitude: 34.0689, longitude: -118.4452 },
  { slug: 'usc', name: 'Southern California', shortName: 'USC', accent: '#990000', accentDark: '#E0696E', latitude: 34.0224, longitude: -118.2851 },
  { slug: 'ucsb', name: 'UC Santa Barbara', shortName: 'UCSB', accent: '#003660', accentDark: '#5FA8D0', latitude: 34.414, longitude: -119.8489 },
  { slug: 'berkeley', name: 'UC Berkeley', shortName: 'Berkeley', accent: '#003262', accentDark: '#4F92D6', latitude: 37.8719, longitude: -122.2585 },
  { slug: 'ucsd', name: 'UC San Diego', shortName: 'UCSD', accent: '#00629B', accentDark: '#5BAAD4', latitude: 32.8801, longitude: -117.234 },
  { slug: 'sdsu', name: 'San Diego State', shortName: 'SDSU', accent: '#A6192E', accentDark: '#E26B79', latitude: 32.7757, longitude: -117.0719 },
];

export const DEFAULT_SCHOOL = SCHOOLS[0];

export function getSchool(slug?: string): School {
  const normalized = (slug ?? '').toLowerCase();
  return SCHOOLS.find((school) => school.slug === normalized) ?? DEFAULT_SCHOOL;
}

type ColorScheme = 'light' | 'dark';
// Widen the literal `as const` colors to plain strings so computed accents fit.
type ThemePalette = Record<ThemeColor, string>;

// Builds a full palette by overriding the primary family with the school's
// accent, so the whole app (buttons, pills, highlights) picks up the color.
export function schoolPalette(slug: string, mode: ColorScheme): ThemePalette {
  const school = getSchool(slug);
  const base = Colors[mode];

  if (mode === 'light') {
    const primary = school.accent;
    return {
      ...base,
      primary,
      primaryPressed: mix(primary, '#000000', 0.14),
      primarySoft: mix(primary, '#FFFFFF', 0.9),
      primaryText: readableOn(primary),
      backgroundSelected: mix(primary, '#FFFFFF', 0.84),
    };
  }

  const primary = school.accentDark;
  return {
    ...base,
    primary,
    primaryPressed: mix(primary, '#FFFFFF', 0.12),
    primarySoft: mix(school.accent, base.background, 0.66),
    primaryText: readableOn(primary),
    backgroundSelected: mix(school.accent, base.background, 0.55),
  };
}

// --- Active-campus context -------------------------------------------------
// Exposes only the slug string so theme consumers re-render when the campus
// changes, not on every unrelated app-state update (e.g. each swipe).

const ActiveCampusContext = createContext<string>(DEFAULT_SCHOOL.slug);

export function CampusAccentProvider({ children }: { children: ReactNode }) {
  const { preferences } = useHiveAppState();
  const slug = (preferences.campusSlug || DEFAULT_SCHOOL.slug).toLowerCase();

  return createElement(ActiveCampusContext, { value: slug }, children);
}

export function useActiveCampusSlug(): string {
  return use(ActiveCampusContext);
}

// --- Color helpers ---------------------------------------------------------

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function toHex(channel: number) {
  return Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');
}

/** Blends `from` toward `to` by `weight` (0 = from, 1 = to). */
function mix(from: string, to: string, weight: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `#${toHex(a.r + (b.r - a.r) * weight)}${toHex(a.g + (b.g - a.g) * weight)}${toHex(
    a.b + (b.b - a.b) * weight,
  )}`.toUpperCase();
}

/** Picks white or near-black text for legibility on the given background. */
function readableOn(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1A1430' : '#FFFFFF';
}
