import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppSection, SurfacePanel } from '@/components/hive/app-shell';
import { Button, FormField, PreferenceChip, Screen, ScreenHeader, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { profileTraits } from '@/data/module-one-demo';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <ScreenHeader
        eyebrow="Setup"
        title="Build your campus search"
        subtitle="A few choices make Discover feel relevant before your group starts voting."
      />

      <AppSection title="Search">
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
            label="Distance"
            value="Under 1.5 miles"
            icon={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
          />
        </SurfacePanel>
      </AppSection>

      <AppSection title="Roommate style">
        <SurfacePanel>
          <View style={styles.chips}>
            {profileTraits.map((trait, index) => (
              <PreferenceChip key={trait} label={trait} selected={index < 4} />
            ))}
          </View>
        </SurfacePanel>
      </AppSection>

      <SurfacePanel>
        <FormField
          label="Move-in window"
          value="Aug 1 - Sep 1"
          icon={hiveSymbol({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' })}
        />
      </SurfacePanel>

      <Button fullWidth onPress={() => router.replace('/discover')}>
        Enter Hive
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
