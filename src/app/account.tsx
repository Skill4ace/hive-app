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
        title="Sign-in and account"
        subtitle="Google auth will connect here in Module 07. The shell is ready now."
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
            subtitle="Firebase Google auth planned"
            value="Connected"
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
