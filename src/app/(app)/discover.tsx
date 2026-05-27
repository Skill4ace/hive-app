import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { LocationFilterBar } from '@/components/hive/app-shell';
import { Screen } from '@/components/hive/primitives';
import { SwipeActionButton, SwipeListingCard } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings } from '@/data/module-one-demo';

export default function DiscoverScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const featured = demoListings[0];
  const cardHeight = Math.min(535, Math.max(410, height * 0.56));

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <LocationFilterBar location="New York, NY" activeFilters={2} />

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
    paddingBottom: 92,
    gap: Spacing.one,
  },
  deck: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: Spacing.one,
  },
  swipeControls: {
    marginTop: -22,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});
