import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const rentOptions = ['No max', '$1,500', '$2,000', '$2,500', '$3,000+'];
const moveOptions = ['ASAP', 'August', 'September', 'Flexible'];
const commuteOptions = ['Walk', 'Bike', 'Drive', 'Transit'];
const commuteMaxOptions = ['10 min', '15 min', '20 min', 'Flexible'];
const roomTypeOptions = ['Apartment', 'Studio', 'Private room', 'Shared room', 'Flexible'];
const bedroomOptions = ['Studio', '1', '2', '3', '4+', 'Flexible'];
const bathOptions = ['1+', '2+', 'Flexible'];
const parkingOptions = ['Needed', 'Nice to have', 'No preference'];

export default function PreferencesScreen() {
  const router = useRouter();

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
            <ThemedText type="sectionTitle">UCLA</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              More campuses later
            </ThemedText>
          </View>
        </SurfacePanel>
      </AppSection>

      <ChipSection title="Rent" options={rentOptions} selected="$2,500" />
      <ChipSection title="Move-in" options={moveOptions} selected="August" />
      <ChipSection title="Commute" options={commuteOptions} selected="Walk" />
      <ChipSection title="Max commute" options={commuteMaxOptions} selected="20 min" />
      <ChipSection title="Listing type" options={roomTypeOptions} selected="Apartment" />

      <AppSection title="Room setup">
        <SurfacePanel>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Bedrooms
            </ThemedText>
            <View style={styles.chips}>
              {bedroomOptions.map((option) => (
                <PreferenceChip key={option} label={option} selected={option === '2'} />
              ))}
            </View>
          </View>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Bathrooms
            </ThemedText>
            <View style={styles.chips}>
              {bathOptions.map((option) => (
                <PreferenceChip key={option} label={option} selected={option === '1+'} />
              ))}
            </View>
          </View>
          <View style={styles.subgroup}>
            <ThemedText type="label" themeColor="textTertiary">
              Parking
            </ThemedText>
            <View style={styles.chips}>
              {parkingOptions.map((option) => (
                <PreferenceChip key={option} label={option} selected={option === 'Nice to have'} />
              ))}
            </View>
          </View>
        </SurfacePanel>
      </AppSection>

      <Button fullWidth onPress={() => router.back()}>
        Save preferences
      </Button>
    </Screen>
  );
}

function ChipSection({ title, options, selected }: { title: string; options: string[]; selected: string }) {
  return (
    <AppSection title={title}>
      <SurfacePanel>
        <View style={styles.chips}>
          {options.map((option) => (
            <PreferenceChip key={option} label={option} selected={option === selected} />
          ))}
        </View>
      </SurfacePanel>
    </AppSection>
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
