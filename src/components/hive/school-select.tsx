import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, IconGlyph, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSchool, SCHOOLS } from '@/lib/schools';

type SchoolSelectProps = {
  value: string;
  onChange: (slug: string) => void;
};

/** A dropdown field that opens a sheet of campuses. Used in onboarding and preferences. */
export function SchoolSelect({ value, onChange }: SchoolSelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = getSchool(value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Campus: ${selected.name}. Tap to change.`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText type="smallBold" style={styles.copy}>
          {selected.shortName}
        </ThemedText>
        <IconGlyph
          name={hiveSymbol({ ios: 'chevron.up.chevron.down', android: 'unfold_more', web: 'unfold_more' })}
          color={theme.textSecondary}
          size={18}
        />
      </Pressable>

      <BottomSheet visible={open} title="Choose your campus" onClose={() => setOpen(false)}>
        <View style={styles.list}>
          {SCHOOLS.map((school) => {
            const isSelected = school.slug === value;

            return (
              <Pressable
                key={school.slug}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(school.slug);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={[styles.copy, isSelected ? { color: theme.primary } : undefined]}>
                  {school.shortName}
                </ThemedText>
                {isSelected ? (
                  <IconGlyph
                    name={hiveSymbol({ ios: 'checkmark', android: 'check', web: 'check' })}
                    color={theme.primary}
                    size={18}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 64,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  list: {
    gap: Spacing.two,
  },
  option: {
    minHeight: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
