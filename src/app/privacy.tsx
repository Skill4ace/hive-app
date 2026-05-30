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
            subtitle="Likes and passes stay private unless they create a group match"
            value="Private"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'envelope.fill', android: 'mail', web: 'mail' })}
            title="Housing partner requests"
            subtitle="Name, email, and message are shared only when you submit a request"
            value="Opt-in"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'trash.fill', android: 'delete', web: 'delete' })}
            title="Account deletion"
            subtitle="Deletes your profile, saved decisions, group votes, and owned groups"
            value="Available"
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
