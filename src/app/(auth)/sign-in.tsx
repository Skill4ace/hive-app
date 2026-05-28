import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppHero } from '@/components/hive/app-shell';
import { Button, HiveLogo, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';

export default function SignInScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <HiveLogo size={56} />
      <AppHero
        eyebrow="Hive"
        title="Find a place near campus with your people"
        subtitle="Swipe homes, compare the map, and let your roommate group surface the places everyone likes."
      />
      <Button
        fullWidth
        leftIcon={hiveSymbol({ ios: 'g.circle.fill', android: 'account_circle', web: 'account_circle' })}
        onPress={() => router.replace('/onboarding')}>
        Continue with Google
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
});
