import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppHero, AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { IconButton, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Notifications"
        title="Stay in sync"
        subtitle="Choose which group updates should reach you first."
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
        }
      />

      <AppSection title="Notify me about">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' })}
            title="Group matches"
            subtitle="When everyone likes the same home"
            value="On"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' })}
            title="Group invites"
            subtitle="When a roommate invites you to a Hive"
            value="On"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' })}
            title="Preference changes"
            subtitle="When shared filters change"
            value="Quiet"
          />
        </SurfacePanel>
      </AppSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
});
