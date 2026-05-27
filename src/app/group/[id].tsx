import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHero, AppSection, SettingRow, StatStrip, SurfacePanel } from '@/components/hive/app-shell';
import { AvatarStack, Button, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { GroupConsensusRow } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings, demoPeople, sharedPreferenceChips } from '@/data/module-one-demo';

export default function GroupDetailScreen() {
  const router = useRouter();

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Group"
        title="Roommate shortlist"
        subtitle="A focused view of shared decisions, open questions, and group preference overlap."
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
        <StatStrip
          items={[
            { value: '4', label: 'Aligned' },
            { value: '1', label: 'Budget gap', tone: 'warning' },
            { value: '0', label: 'Dealbreakers', tone: 'success' },
          ]}
        />
      </AppHero>

      <AppSection title="Decision queue">
        <SurfacePanel>
          {demoListings.slice(0, 3).map((listing, index) => (
            <GroupConsensusRow
              key={listing.id}
              listing={listing}
              likes={index === 0 ? '3/3' : '2/3'}
              status={index === 0 ? 'matched' : 'discussing'}
              people={demoPeople}
            />
          ))}
        </SurfacePanel>
      </AppSection>

      <AppSection title="Shared rules">
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
