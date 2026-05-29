import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  useHiveAppState,
  type CommuteMode,
  type MoveInPreference,
  type ParkingPreference,
  type SearchPreferences,
} from '@/lib/hive-state';

const rentOptions = [
  { label: '$1,500', min: 600, max: 1500 },
  { label: '$2,000', min: 600, max: 2000 },
  { label: '$2,500', min: 600, max: 2500 },
  { label: '$3,000+', min: 600, max: 3000 },
];
const moveOptions: { label: string; value: MoveInPreference }[] = [
  { label: 'August', value: 'Aug' },
  { label: 'September', value: 'Sep' },
  { label: 'October', value: 'Oct' },
  { label: 'Flexible', value: 'Flexible' },
];
const commuteOptions: { label: string; value: CommuteMode }[] = [
  { label: 'Walk', value: 'walk' },
  { label: 'Bike', value: 'bike' },
  { label: 'Drive', value: 'drive' },
  { label: 'Transit', value: 'transit' },
];
const distanceOptions = [0.75, 1, 1.25, 1.5, 2, 2.5];
const bedroomOptions = [1, 2, 3, 4, 5];
const bathOptions = [1, 2, 3, 4];
const parkingOptions: { label: string; value: ParkingPreference }[] = [
  { label: 'Needed', value: 'needed' },
  { label: 'Nice to have', value: 'nice' },
  { label: 'No preference', value: 'none' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { preferences, updatePreferences } = useHiveAppState();
  const [draft, setDraft] = useState<SearchPreferences>(preferences);

  const save = () => {
    updatePreferences(draft);
    router.back();
  };

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title="Search"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' })}
            label="Close"
            onPress={() => router.back()}
          />
        }
      />

      <AppSection title="Campus">
        <SurfacePanel>
          <View style={styles.singleRow}>
            <ThemedText type="sectionTitle">{draft.campusName}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              More campuses later
            </ThemedText>
          </View>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Rent">
        <SurfacePanel>
          <View style={styles.singleRow}>
            <ThemedText type="smallBold">
              ${draft.budgetMin.toLocaleString()} - ${draft.budgetMax.toLocaleString()}
            </ThemedText>
            <View style={styles.chips}>
              {rentOptions.map((option) => (
                <PreferenceChip
                  key={option.label}
                  label={option.label}
                  selected={draft.budgetMax === option.max}
                  onPress={() => setDraft((current) => ({ ...current, budgetMin: option.min, budgetMax: option.max }))}
                />
              ))}
            </View>
          </View>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Move-in">
        <SurfacePanel>
          <View style={styles.chips}>
            {moveOptions.map((option) => (
              <PreferenceChip
                key={option.value}
                label={option.label}
                selected={draft.moveIn === option.value}
                onPress={() => setDraft((current) => ({ ...current, moveIn: option.value }))}
              />
            ))}
          </View>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Commute">
        <SurfacePanel>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Mode
            </ThemedText>
            <View style={styles.chips}>
              {commuteOptions.map((option) => (
                <PreferenceChip
                  key={option.value}
                  label={option.label}
                  selected={draft.commuteMode === option.value}
                  onPress={() => setDraft((current) => ({ ...current, commuteMode: option.value }))}
                />
              ))}
            </View>
          </View>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Distance to campus
            </ThemedText>
            <View style={styles.chips}>
              {distanceOptions.map((option) => (
                <PreferenceChip
                  key={option}
                  label={`${option} mi`}
                  selected={draft.distanceMiles === option}
                  onPress={() => setDraft((current) => ({ ...current, distanceMiles: option }))}
                />
              ))}
            </View>
          </View>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Room setup">
        <SurfacePanel>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Bedrooms
            </ThemedText>
            <View style={styles.chips}>
              {bedroomOptions.map((option) => (
                <PreferenceChip
                  key={option}
                  label={option === 5 ? '5+' : String(option)}
                  selected={draft.bedrooms === option}
                  onPress={() => setDraft((current) => ({ ...current, bedrooms: option }))}
                />
              ))}
            </View>
          </View>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Bathrooms
            </ThemedText>
            <View style={styles.chips}>
              {bathOptions.map((option) => (
                <PreferenceChip
                  key={option}
                  label={option === 4 ? '4+' : `${option}+`}
                  selected={draft.bathrooms === option}
                  onPress={() => setDraft((current) => ({ ...current, bathrooms: option }))}
                />
              ))}
            </View>
          </View>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Parking
            </ThemedText>
            <View style={styles.chips}>
              {parkingOptions.map((option) => (
                <PreferenceChip
                  key={option.value}
                  label={option.label}
                  selected={draft.parking === option.value}
                  onPress={() => setDraft((current) => ({ ...current, parking: option.value }))}
                />
              ))}
            </View>
          </View>
        </SurfacePanel>
      </AppSection>

      <Button fullWidth onPress={save}>
        Save preferences
      </Button>
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
  singleRow: {
    gap: Spacing.half,
  },
  subgroup: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
