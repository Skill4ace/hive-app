import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHero, AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { AvatarStack, Button, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { demoPeople, sharedPreferenceChips } from '@/data/module-one-demo';

export default function GroupDetailScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Group"
        title="UCLA Roommates"
        subtitle="Invite roommates and keep shared search rules aligned. Matched homes live in Saved."
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
        }>
        <View style={styles.members}>
          <AvatarStack people={demoPeople} size={38} />
          <Button variant="secondary">Invite</Button>
        </View>
      </AppHero>

      <AppSection title="Shared search rules">
        <SurfacePanel>
          <View style={styles.chips}>
            {sharedPreferenceChips.map((chip) => (
              <PreferenceChip key={chip} label={chip} selected />
            ))}
          </View>
          <SettingRow
            icon={hiveSymbol({ ios: 'dollarsign.circle.fill', android: 'attach_money', web: 'attach_money' })}
            title="Budget range"
            subtitle="$1,200 - $2,000 per person"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' })}
            title="Move-in window"
            subtitle="August 1 through September 1"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
            title="Campus distance"
            subtitle="Under 1.5 miles from UCLA"
          />
        </SurfacePanel>
      </AppSection>
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
  members: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
