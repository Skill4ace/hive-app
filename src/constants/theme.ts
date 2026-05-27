import '@/global.css';

import { Platform } from 'react-native';

const primitive = {
  purple: '#341539',
  purpleLight: '#6A4A70',
  purpleMuted: '#4B2651',
  purpleDark: '#241027',
  purpleShimmer: '#DCCFDF',
  orchid: '#B985CC',
  orchidLight: '#DFC3EA',
  orchidMuted: '#9F6DB3',
  orchidDark: '#7A4B8E',
  orchidShimmer: '#F6EBFA',
  shell: '#FCF8FD',
  porcelain: '#FFFFFF',
  ink: '#16091B',
  graphite: '#2A2030',
  fog: '#F5EFF7',
  mist: '#EEE3F1',
  blush: '#F84E92',
  gold: '#F6B332',
  green: '#3BAA78',
  amber: '#D8892F',
} as const;

export const Colors = {
  light: {
    text: primitive.purpleDark,
    textSecondary: primitive.purpleLight,
    textTertiary: '#8E7694',
    background: primitive.shell,
    backgroundElevated: primitive.porcelain,
    backgroundElement: primitive.fog,
    backgroundSelected: '#EADBEE',
    surface: primitive.porcelain,
    surfaceMuted: '#FBF5FC',
    surfaceGlass: 'rgba(255, 255, 255, 0.78)',
    border: '#EADFEB',
    borderStrong: '#D9C6DD',
    primary: '#64207A',
    primaryPressed: primitive.purpleMuted,
    primarySoft: '#F0E3F3',
    primaryText: '#FFFFFF',
    accent: primitive.blush,
    accentSoft: '#FFE8F1',
    gold: primitive.gold,
    goldSoft: '#FFF2CF',
    success: primitive.green,
    successSoft: '#E7F6EF',
    warning: primitive.amber,
    warningSoft: '#FFF1D9',
    danger: '#C9365C',
    dangerSoft: '#FFE6EC',
    shadow: '#2B1430',
    scrim: 'rgba(22, 9, 27, 0.42)',
    imageScrim: 'rgba(20, 9, 24, 0.42)',
    shimmer: primitive.purpleShimmer,
    inverse: '#FFFFFF',
  },
  dark: {
    text: '#FBF3FF',
    textSecondary: primitive.orchidLight,
    textTertiary: '#C5A7CF',
    background: '#120716',
    backgroundElevated: '#1E1024',
    backgroundElement: '#2A1730',
    backgroundSelected: '#3A2044',
    surface: '#1E1024',
    surfaceMuted: '#25142C',
    surfaceGlass: 'rgba(30, 16, 36, 0.82)',
    border: '#3C2445',
    borderStrong: '#5B3869',
    primary: primitive.orchid,
    primaryPressed: primitive.orchidLight,
    primarySoft: '#382041',
    primaryText: primitive.purpleDark,
    accent: '#FF6AA8',
    accentSoft: '#4A1930',
    gold: '#FFD273',
    goldSoft: '#3E2F12',
    success: '#5AD39C',
    successSoft: '#123627',
    warning: '#E9A751',
    warningSoft: '#3C2811',
    danger: '#FF7A95',
    dangerSoft: '#421521',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.54)',
    imageScrim: 'rgba(0, 0, 0, 0.48)',
    shimmer: primitive.orchidDark,
    inverse: primitive.purpleDark,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Avenir Next',
    serif: 'Georgia',
    rounded: 'Avenir Next',
    mono: 'ui-monospace',
    display: 'Avenir Next',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
    display: 'sans-serif-medium',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
    display: 'sans-serif',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    display: 'var(--font-serif)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  seven: 80,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const Shadows = {
  soft: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  card: {
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  floating: {
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 9,
  },
} as const;

export const Motion = {
  fast: 150,
  base: 220,
  slow: 420,
  springDamping: 18,
  springMass: 0.8,
} as const;

export const Haptics = {
  selection: 'selection',
  light: 'impactLight',
  medium: 'impactMedium',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 920;

export const HivePrimitiveColors = primitive;
