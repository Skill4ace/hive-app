import { StyleSheet, View } from 'react-native';

import { AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconGlyph, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function GroupsScreen() {
  const theme = useTheme();

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar title="Groups" />

      <SurfacePanel>
        <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
          <IconGlyph
            name={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
            color={theme.primary}
            size={34}
          />
        </View>
        <View style={styles.copy}>
          <ThemedText type="title" style={styles.centerText}>
            Start a roommate group
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Create a group or join one with an invite code to see shared matches in Saved.
          </ThemedText>
        </View>
        <Button fullWidth leftIcon={hiveSymbol({ ios: 'plus', android: 'add', web: 'add' })}>
          Create group
        </Button>
        <Button
          fullWidth
          variant="secondary"
          leftIcon={hiveSymbol({ ios: 'link', android: 'link', web: 'link' })}>
          Join with code
        </Button>
      </SurfacePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: 110,
    gap: Spacing.four,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: Radius.xl,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: Spacing.one,
  },
  centerText: {
    textAlign: 'center',
  },
});
