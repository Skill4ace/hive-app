import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppTopBar } from '@/components/hive/app-shell';
import { SavedListingRow } from '@/components/hive/listing';
import { Button, EmptyState, IconButton, Screen, SegmentedControl, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { useSavedRealListings } from '@/hooks/use-real-listings';
import { useHiveAppState } from '@/lib/hive-state';

type SavedTab = 'all' | 'matched';

const options: { label: string; value: SavedTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Matched', value: 'matched' },
];

export default function SavedScreen() {
  const router = useRouter();
  const { likedIds } = useHiveAppState();
  const [tab, setTab] = useState<SavedTab>('all');
  const { data: savedListings, loading, error, refresh } = useSavedRealListings(likedIds);
  const visibleListings = tab === 'all' ? savedListings : [];

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

      {loading ? (
        <View style={styles.list}>
          <Skeleton height={112} radius={22} />
          <Skeleton height={112} radius={22} />
          <Skeleton height={112} radius={22} />
        </View>
      ) : error ? (
        <EmptyState
          icon={hiveSymbol({ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' })}
          title="Saved did not load"
          body={error}
          action={<Button onPress={refresh}>Try again</Button>}
        />
      ) : visibleListings.length === 0 ? (
        <EmptyState
          icon={hiveSymbol({ ios: tab === 'all' ? 'heart' : 'sparkles', android: tab === 'all' ? 'favorite_border' : 'auto_awesome', web: tab === 'all' ? 'favorite_border' : 'auto_awesome' })}
          title={tab === 'all' ? 'No saved places yet' : 'No group matches yet'}
          body={tab === 'all' ? 'Like a place in Discover and it will show up here.' : 'When your group likes the same place, it will show up here.'}
          action={
            <Button onPress={() => router.push('/discover')}>
              Discover
            </Button>
          }
        />
      ) : (
        <View style={styles.list}>
          {visibleListings.map((listing) => (
            <SavedListingRow
              key={listing.id}
              listing={listing}
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
