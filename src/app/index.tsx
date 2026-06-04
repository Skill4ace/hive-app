import { Redirect } from 'expo-router';

import { useHiveAppState } from '@/lib/hive-state';

export default function IndexRedirect() {
  const { hydrated, preferences } = useHiveAppState();

  if (!hydrated) return null;

  return <Redirect href={preferences.username.trim().length >= 2 ? '/discover' : '/sign-in'} />;
}
