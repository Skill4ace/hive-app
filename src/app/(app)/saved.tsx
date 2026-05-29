import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppTopBar } from '@/components/hive/app-shell';
import { SavedListingRow } from '@/components/hive/listing';
import { Button, EmptyState, IconButton, Screen, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { useSavedRealListings } from '@/hooks/use-real-listings';
import { useHiveAppState } from '@/lib/hive-state';

export default function SavedScreen() {
  const router = useRouter();
  const { likedIds } = useHiveAppState();
  const { data: visibleListings, loading, error, refresh } = useSavedRealListings(likedIds);

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
          icon={hiveSymbol({ ios: 'heart', android: 'favorite_border', web: 'favorite_border' })}
          title="No saved places yet"
          body="Like a place in Discover and it will show up here."
          action={<Button onPress={() => router.push('/discover')}>Discover</Button>}
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
