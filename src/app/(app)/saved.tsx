import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppTopBar } from '@/components/hive/app-shell';
import { IconButton, Screen, SegmentedControl, hiveSymbol } from '@/components/hive/primitives';
import { GroupConsensusRow, ListingCard } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings, demoPeople } from '@/data/module-one-demo';

type SavedTab = 'all' | 'matched';

const options: { label: string; value: SavedTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Matched', value: 'matched' },
];

export default function SavedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<SavedTab>('all');

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title="Saved"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' })}
            label="Sort saved homes"
          />
        }
      />
      <SegmentedControl options={options} value={tab} onChange={setTab} />

      {tab === 'all' ? (
        <View style={styles.grid}>
          {demoListings.map((listing, index) => (
            <View key={listing.id} style={styles.gridItem}>
              <ListingCard
                listing={listing}
                saved={index < 3}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.matchedList}>
          {demoListings.map((listing, index) => (
            <GroupConsensusRow
              key={listing.id}
              listing={listing}
              likes={index % 2 === 0 ? '3/3' : '2/3'}
              status={index % 2 === 0 ? 'matched' : 'discussing'}
              people={demoPeople}
            />
          ))}
        </View>
      )}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  gridItem: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 164,
  },
  matchedList: {
    gap: Spacing.two,
  },
});
