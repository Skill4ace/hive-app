import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppTopBar } from '@/components/hive/app-shell';
import { IconButton, Screen, SegmentedControl, hiveSymbol } from '@/components/hive/primitives';
import { GroupConsensusRow, SavedListingRow } from '@/components/hive/listing';
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
  const matchedListings = demoListings.filter((listing) => listing.status === 'matched');

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
        <View style={styles.list}>
          {demoListings.map((listing) => (
            <SavedListingRow
              key={listing.id}
              listing={listing}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {matchedListings.map((listing) => (
            <GroupConsensusRow
              key={listing.id}
              listing={listing}
              likes="3/3"
              status="matched"
              people={demoPeople}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
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
  list: {
    gap: Spacing.two,
  },
});
