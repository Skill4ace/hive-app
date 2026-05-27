import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppTopBar } from '@/components/hive/app-shell';
import { Screen } from '@/components/hive/primitives';
import { ListingCard, SwipeActionButton } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings } from '@/data/module-one-demo';

export default function DiscoverScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const featured = demoListings[0];
  const cardHeight = Math.min(520, Math.max(430, height * 0.62));

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar title="Discover" />

      <View style={styles.deck}>
        <ListingCard
          listing={featured}
          variant="hero"
          heroHeight={cardHeight}
          saved
          onPress={() => router.push({ pathname: '/listing/[id]', params: { id: featured.id } })}
        />
        <View style={styles.swipeControls}>
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
    paddingBottom: 102,
    gap: Spacing.one,
  },
  deck: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: Spacing.one,
  },
  swipeControls: {
    marginTop: -24,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
  },
});
