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
        eyebrow="Welcome"
        title="Find a place with your people"
        subtitle="Firebase Google sign-in will connect here in Module 07. For now, enter the app shell."
      />
      <Button
        fullWidth
        leftIcon={hiveSymbol({ ios: 'g.circle.fill', android: 'account_circle', web: 'account_circle' })}
        onPress={() => router.replace('/discover')}>
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
