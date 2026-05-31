import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AppearanceProvider, useAppColorScheme } from '@/lib/appearance';
import { HiveGroupProvider } from '@/lib/group-state';
import { HiveAppStateProvider } from '@/lib/hive-state';
import { CampusAccentProvider } from '@/lib/schools';

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppearanceProvider>
        <RootLayoutNav />
      </AppearanceProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const mode = useAppColorScheme();
  const colors = Colors[mode];
  const navigationTheme = useMemo(
    () => ({
      ...(mode === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    }),
    [colors, mode]
  );

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <ThemeProvider value={navigationTheme}>
      <HiveAppStateProvider>
        <CampusAccentProvider>
          <HiveGroupProvider>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <AnimatedSplashOverlay />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(auth)" options={{ presentation: 'card', gestureEnabled: false }} />
              <Stack.Screen name="listing/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="group/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen name="preferences" options={{ presentation: 'card' }} />
              <Stack.Screen name="account" options={{ presentation: 'card' }} />
              <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
              <Stack.Screen name="privacy" options={{ presentation: 'card' }} />
            </Stack>
          </HiveGroupProvider>
        </CampusAccentProvider>
      </HiveAppStateProvider>
    </ThemeProvider>
  );
}
