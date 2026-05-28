import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconGlyph, Pill, type IconName } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppTopBarProps = {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function AppTopBar({ title, left, right }: AppTopBarProps) {
  return (
    <View style={styles.topBar}>
      {left ? <View style={styles.topSide}>{left}</View> : null}
      <ThemedText type="title" style={[styles.topTitle, !left && styles.topTitleLeading]}>
        {title}
      </ThemedText>
      {right ? <View style={styles.topSide}>{right}</View> : <View style={styles.topSide} />}
    </View>
  );
}

type LocationFilterBarProps = {
  location: string;
  activeFilters?: number;
  onLocationPress?: () => void;
  onFilterPress?: () => void;
};

export function LocationFilterBar({
  location,
  activeFilters,
  onLocationPress,
  onFilterPress,
}: LocationFilterBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.locationBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change location"
        onPress={onLocationPress}
        style={({ pressed }) => [
          styles.locationButton,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.74 : 1,
          },
        ]}>
        <IconGlyph
          name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
          color={theme.primary}
          size={18}
        />
        <ThemedText type="smallBold" numberOfLines={1} style={styles.locationText}>
          {location}
        </ThemedText>
        <IconGlyph
          name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
          color={theme.textSecondary}
          size={16}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.filterButton,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.74 : 1,
          },
        ]}>
        <IconGlyph
          name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
          color={theme.text}
          size={21}
        />
        {activeFilters ? (
          <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
            <ThemedText type="caption" style={{ color: theme.primaryText }}>
              {activeFilters}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

type AppHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
};

export function AppHero({ eyebrow, title, subtitle, right, children }: AppHeroProps) {
  const theme = useTheme();

  return (
    <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <View style={styles.heroTop}>
        <View style={styles.heroCopy}>
          {eyebrow ? (
            <ThemedText type="label" themeColor="textTertiary">
              {eyebrow}
            </ThemedText>
          ) : null}
          <ThemedText type="title">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroSubtitle}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {right ? <View style={styles.heroRight}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

type AppSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function AppSection({ title, action, children }: AppSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">{title}</ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

type StatStripProps = {
  items: { label: string; value: string; tone?: 'primary' | 'success' | 'warning' | 'accent' }[];
};

export function StatStrip({ items }: StatStripProps) {
  const theme = useTheme();

  return (
    <View style={styles.statStrip}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.statItem,
            {
              backgroundColor:
                item.tone === 'success'
                  ? theme.successSoft
                  : item.tone === 'warning'
                    ? theme.warningSoft
                    : item.tone === 'accent'
                      ? theme.accentSoft
                      : theme.primarySoft,
            },
          ]}>
          <ThemedText
            type="metric"
            style={{
              color:
                item.tone === 'success'
                  ? theme.success
                  : item.tone === 'warning'
                    ? theme.warning
                    : item.tone === 'accent'
                      ? theme.accent
                      : theme.primary,
            }}>
            {item.value}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {item.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

type SettingRowProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
};

export function SettingRow({ icon, title, subtitle, value, onPress }: SettingRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.74 : 1,
        },
      ]}>
      <View style={[styles.settingIcon, { backgroundColor: theme.primarySoft }]}>
        <IconGlyph name={icon} color={theme.primary} size={18} />
      </View>
      <View style={styles.settingCopy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? <Pill>{value}</Pill> : null}
      {onPress ? (
        <IconGlyph
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          color={theme.textTertiary}
          size={16}
        />
      ) : null}
    </Pressable>
  );
}

export function SurfacePanel({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.surfacePanel, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  topSide: {
    minWidth: 46,
    alignItems: 'flex-end',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
  },
  topTitleLeading: {
    textAlign: 'left',
  },
  locationBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationText: {
    flex: 1,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  hero: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Shadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  heroSubtitle: {
    maxWidth: 330,
  },
  heroRight: {
    paddingTop: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statStrip: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statItem: {
    flex: 1,
    minHeight: 74,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    justifyContent: 'center',
    gap: 2,
  },
  settingRow: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
    gap: 1,
  },
  surfacePanel: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
