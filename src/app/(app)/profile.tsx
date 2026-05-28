import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { PreferenceSummary } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { preferenceItems, profileTraits } from '@/data/module-one-demo';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title="Profile"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'gearshape.fill', android: 'settings', web: 'settings' })}
            label="Settings"
            onPress={() => router.push('/account')}
          />
        }
      />

      <AppSection title="Campus search">
        <PreferenceSummary title="Current search" items={preferenceItems} actionLabel="Edit" />
      </AppSection>

      <AppSection title="Lifestyle">
        <SurfacePanel>
          <View style={styles.traits}>
            {profileTraits.map((trait, index) => (
              <PreferenceChip key={trait} label={trait} selected={index < 3} />
            ))}
          </View>
          <Button fullWidth onPress={() => router.push('/preferences')}>
            Edit preferences
          </Button>
        </SurfacePanel>
      </AppSection>

      <Button fullWidth variant="secondary" onPress={() => router.push('/account')}>
        Account settings
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: 110,
  },
  traits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
