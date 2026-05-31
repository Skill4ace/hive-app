/**
 * Resolves the active color palette. The light/dark scheme comes from the
 * in-app appearance preference (see `@/lib/appearance`), and the primary accent
 * is tinted to the selected school's brand color (see `@/lib/schools`).
 */

import { useMemo } from 'react';

import { useAppColorScheme } from '@/lib/appearance';
import { schoolPalette, useActiveCampusSlug } from '@/lib/schools';

export function useTheme() {
  const scheme = useAppColorScheme();
  const campusSlug = useActiveCampusSlug();

  return useMemo(() => schoolPalette(campusSlug, scheme), [campusSlug, scheme]);
}
