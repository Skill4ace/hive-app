import { StyleSheet } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { IconButton, Screen, hiveSymbol } from '@/components/hive/primitives';
import { GroupConsensusRow } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings, demoPeople } from '@/data/module-one-demo';

export default function GroupsScreen() {
  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title="Groups"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' })}
            label="Invite roommate"
          />
        }
      />

      <AppSection title="Matched homes">
        <SurfacePanel>
          {demoListings.map((listing, index) => (
            <GroupConsensusRow
              key={listing.id}
              listing={listing}
              likes={index % 2 === 0 ? '3/3' : '2/3'}
              status={index % 2 === 0 ? 'matched' : 'discussing'}
              people={demoPeople}
            />
          ))}
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
    paddingBottom: 110,
    gap: Spacing.three,
  },
});
