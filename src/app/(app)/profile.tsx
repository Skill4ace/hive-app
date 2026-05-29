import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { Button, Pill, Screen, hiveSymbol } from '@/components/hive/primitives';
import { PreferenceSummary } from '@/components/hive/listing';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHiveAppState } from '@/lib/hive-state';

export default function ProfileScreen() {
  const router = useRouter();
  const { preferences, likedIds, passedIds } = useHiveAppState();
  const searchItems = [
    {
      icon: hiveSymbol({ ios: 'graduationcap.fill', android: 'school', web: 'school' }),
      label: 'Campus',
      value: preferences.campusName,
    },
    {
      icon: hiveSymbol({ ios: 'dollarsign.circle.fill', android: 'attach_money', web: 'attach_money' }),
      label: 'Rent',
      value: `$${preferences.budgetMin.toLocaleString()} - $${preferences.budgetMax.toLocaleString()}`,
    },
    {
      icon: hiveSymbol({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }),
      label: 'Move-in',
      value: preferences.moveIn,
    },
    {
      icon: hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' }),
      label: 'Distance',
      value: `Inside ${preferences.distanceMiles} mi`,
    },
  ];
  const roomItems = [
    {
      icon: hiveSymbol({ ios: 'building.2.fill', android: 'apartment', web: 'apartment' }),
      label: 'Type',
      value: 'Apartment',
    },
    {
      icon: hiveSymbol({ ios: 'bed.double.fill', android: 'bed', web: 'bed' }),
      label: 'Bedrooms',
      value: `${preferences.bedrooms}`,
    },
    {
      icon: hiveSymbol({ ios: 'bathtub.fill', android: 'bathtub', web: 'bathtub' }),
      label: 'Bathrooms',
      value: `${preferences.bathrooms}+`,
    },
    {
      icon: hiveSymbol({ ios: 'parkingsign.circle.fill', android: 'local_parking', web: 'local_parking' }),
      label: 'Parking',
      value: preferences.parking === 'needed' ? 'Needed' : preferences.parking === 'nice' ? 'Nice to have' : 'No preference',
    },
  ];

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar title="Profile" />

      <View style={styles.identity}>
        <View style={styles.avatar}>
          <ThemedText type="subtitle" style={styles.avatarText}>
            {preferences.username.trim().slice(0, 1).toUpperCase() || 'H'}
          </ThemedText>
        </View>
        <View style={styles.identityCopy}>
          <ThemedText type="title">@{preferences.username}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {likedIds.length} saved, {passedIds.length} passed
          </ThemedText>
        </View>
        <Pill tone="primary">Solo feed</Pill>
      </View>

      <AppSection title="Search setup">
        <PreferenceSummary title="Your filters" items={searchItems} actionLabel="Edit" />
      </AppSection>

      <AppSection title="Room fit">
        <PreferenceSummary title="Listing shape" items={roomItems} actionLabel="Edit" />
      </AppSection>

      <AppSection title="Group">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'person.2.fill', android: 'group', web: 'group' })}
            title="Private group"
            subtitle="Create a group or join with an invite code"
            value="Not joined"
            onPress={() => router.push({ pathname: '/onboarding', params: { preview: '1' } })}
          />
        </SurfacePanel>
      </AppSection>

      <View style={styles.actions}>
        <Button
          fullWidth
          variant="ghost"
          leftIcon={hiveSymbol({ ios: 'rectangle.stack.fill', android: 'view_carousel', web: 'view_carousel' })}
          onPress={() => router.push({ pathname: '/onboarding', params: { preview: '1' } })}>
          View onboarding
        </Button>
        <Button fullWidth onPress={() => router.push('/preferences')}>
          Edit search preferences
        </Button>
        <Button
          fullWidth
          variant="danger"
          leftIcon={hiveSymbol({ ios: 'trash.fill', android: 'delete', web: 'delete' })}>
          Delete account
        </Button>
      </View>
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
  identity: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#241027',
  },
  avatarText: {
    color: '#FFFFFF',
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.two,
  },
});
