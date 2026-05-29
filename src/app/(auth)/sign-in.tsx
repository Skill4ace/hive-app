import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.brandStack}>
        <View style={[styles.logoHalo, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <Image
            source={require('../../../hivelogoappicon.png')}
            style={styles.logo}
            contentFit="cover"
          />
        </View>
        <View style={styles.copy}>
          <ThemedText type="display" style={styles.wordmark}>
            Hive
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Swipe apartments near campus, then see what your group agrees on.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          fullWidth
          rightIcon={hiveSymbol({ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' })}
          onPress={() => router.replace('/onboarding')}>
          Get started
        </Button>
        <ThemedText type="caption" themeColor="textTertiary" style={styles.footerNote}>
          Username only for now. No account setup needed.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
  },
  brandStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  logoHalo: {
    width: 172,
    height: 172,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  copy: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  wordmark: {
    fontSize: 54,
    lineHeight: 60,
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 300,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.three,
  },
  footerNote: {
    textAlign: 'center',
  },
});
