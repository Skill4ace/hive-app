import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { Button, FormField, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { profileTraits } from '@/data/module-one-demo';

export default function PreferencesScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title="Preferences"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' })}
            label="Close"
            onPress={() => router.back()}
          />
        }
      />

      <AppSection title="Housing">
        <SurfacePanel>
          <FormField
            label="Campus"
            value="UCLA"
            icon={hiveSymbol({ ios: 'graduationcap.fill', android: 'school', web: 'school' })}
          />
          <FormField
            label="Budget per person"
            value="$1,200 - $2,000"
            icon={hiveSymbol({ ios: 'dollarsign.circle.fill', android: 'attach_money', web: 'attach_money' })}
          />
          <FormField
            label="Neighborhoods"
            value="Westwood, Sawtelle, West LA"
            icon={hiveSymbol({ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' })}
          />
          <FormField
            label="Distance to campus"
            value="Under 1.5 miles"
            icon={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
          />
          <FormField
            label="Move-in"
            value="Aug 1 - Sep 1"
            icon={hiveSymbol({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' })}
          />
        </SurfacePanel>
      </AppSection>

      <AppSection title="Lifestyle">
        <SurfacePanel>
          <View style={styles.chips}>
            {profileTraits.map((trait, index) => (
              <PreferenceChip key={trait} label={trait} selected={index < 4} />
            ))}
          </View>
        </SurfacePanel>
      </AppSection>

      <Button fullWidth onPress={() => router.back()}>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
