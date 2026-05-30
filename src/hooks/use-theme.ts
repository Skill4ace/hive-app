/**
 * Resolves the active color palette. The scheme comes from the in-app
 * appearance preference (Light / Dark / System) rather than the OS directly,
 * so the Profile toggle can override it. See `@/lib/appearance`.
 */

import { Colors } from '@/constants/theme';
import { useAppColorScheme } from '@/lib/appearance';

export function useTheme() {
  return Colors[useAppColorScheme()];
}
