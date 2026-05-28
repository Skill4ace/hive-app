import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppHero, AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';

export default function AccountScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Account"
        title="Maya's Hive"
        subtitle="Manage sign-in, notifications, privacy, and account deletion."
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
        }
      />

      <AppSection title="Account details">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'person.crop.circle.fill', android: 'person', web: 'person' })}
            title="Maya Chen"
            subtitle="maya@example.com"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'g.circle.fill', android: 'account_circle', web: 'account_circle' })}
            title="Google sign-in"
            subtitle="Firebase identity for campus housing data"
            value="Connected"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'bell.fill', android: 'notifications', web: 'notifications' })}
            title="Notifications"
            subtitle="Group matches and invites"
            onPress={() => router.push('/notifications')}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'hand.raised.fill', android: 'pan_tool', web: 'pan_tool' })}
            title="Privacy"
            subtitle="What roommates can see"
            onPress={() => router.push('/privacy')}
          />
          <Button variant="danger" fullWidth>
            Delete account
          </Button>
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
