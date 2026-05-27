import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppHero, AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { IconButton, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Privacy"
        title="Control your housing profile"
        subtitle="Keep personal decisions private while sharing enough for group matching."
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
        }
      />

      <AppSection title="Sharing">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
            title="Visible to group members"
            subtitle="Budget range, neighborhoods, move-in window"
            value="Limited"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'hand.raised.fill', android: 'pan_tool', web: 'pan_tool' })}
            title="Listing decisions"
            subtitle="Likes and passes are private until a group match"
            value="Private"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'square.and.arrow.down.fill', android: 'download', web: 'download' })}
            title="Data export"
            subtitle="Planned before App Store submission"
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
