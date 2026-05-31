import { Stack } from 'expo-router';

import { BrandAccentProvider } from '@/lib/schools';

export default function AuthLayout() {
  // The pre-app flow stays in Hive purple; the school accent only takes over
  // once the user is inside the app with a committed campus.
  return (
    <BrandAccentProvider>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
    </BrandAccentProvider>
  );
}
