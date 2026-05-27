import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHero, SurfacePanel } from '@/components/hive/app-shell';
import { Button, PreferenceChip, Screen } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { profileTraits } from '@/data/module-one-demo';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Onboarding"
        title="Start with a few preferences"
        subtitle="This route is ready for Module 03. It currently previews the planned flow entry."
      />
      <SurfacePanel>
        <View style={styles.chips}>
          {profileTraits.map((trait, index) => (
            <PreferenceChip key={trait} label={trait} selected={index < 3} />
          ))}
        </View>
      </SurfacePanel>
      <Button fullWidth onPress={() => router.replace('/discover')}>
        Enter Hive
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.six,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
