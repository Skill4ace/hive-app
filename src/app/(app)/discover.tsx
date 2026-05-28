import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppTopBar, LocationFilterBar } from '@/components/hive/app-shell';
import { Screen } from '@/components/hive/primitives';
import { SwipeActionButton, SwipeListingCard } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings } from '@/data/module-one-demo';

export default function DiscoverScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const featured = demoListings[0];
  const cardHeight = Math.min(585, Math.max(445, height * 0.6));

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar title="Discover" />
      <LocationFilterBar location="UCLA" activeFilters={2} />

      <View style={styles.deck}>
        <SwipeListingCard
          listing={featured}
          height={cardHeight}
          onPress={() => router.push({ pathname: '/listing/[id]', params: { id: featured.id } })}
        />
        <View style={styles.swipeControls}>
          <SwipeActionButton action="undo" />
          <SwipeActionButton action="pass" />
          <SwipeActionButton action="like" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: 16,
    gap: Spacing.two,
  },
  deck: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  swipeControls: {
    marginTop: Spacing.three,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});
