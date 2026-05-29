/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppTopBar, LocationFilterBar } from '@/components/hive/app-shell';
import { SwipeActionButton, SwipeListingCard, type Listing } from '@/components/hive/listing';
import { Button, EmptyState, Screen, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRealListings } from '@/hooks/use-real-listings';
import { useHiveAppState, type ListingDecision } from '@/lib/hive-state';

export default function DiscoverScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const { preferences, decisions, recordDecision, undoDecision } = useHiveAppState();
  const { data: listings, loading, error, refresh } = useRealListings();
  const [deck, setDeck] = useState<Listing[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const featured = deck[0];
  const nextListing = deck[1];
  const cardHeight = Math.min(575, Math.max(455, height * 0.58));
  const swipeThreshold = Math.min(width * 0.26, 128);
  const resetMotion = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    dragX.value = 0;
    setIsTransitioning(false);
  }, [dragX, translateX, translateY]);
  const activeFilters = useMemo(() => {
    let count = 0;
    if (preferences.budgetMax < 3000) count += 1;
    if (preferences.distanceMiles < 2.5) count += 1;
    if (preferences.bedrooms > 1) count += 1;
    if (preferences.moveIn !== 'Flexible') count += 1;
    return count;
  }, [preferences]);

  useEffect(() => {
    setDeck(listings.filter((listing) => !decisions[listing.id]));
    resetMotion();
  }, [decisions, listings, resetMotion]);

  const removeTopCard = (decision: ListingDecision) => {
    if (!featured) return;

    recordDecision(featured.id, decision, featured.match);
    setDeck((current) => current.slice(1));
    resetMotion();
  };

  const undo = () => {
    if (isTransitioning) return;
    undoDecision();
  };

  const openDetail = () => {
    if (!featured) return;
    router.push({ pathname: '/listing/[id]', params: { id: featured.id } });
  };

  const animateDecision = (decision: ListingDecision) => {
    if (isTransitioning || !featured) return;

    setIsTransitioning(true);
    const direction = decision === 'liked' ? 1 : -1;
    const targetX = direction * (width + 140);
    dragX.value = withTiming(targetX, { duration: 230 });
    translateY.value = withTiming(-8, { duration: 120 });
    translateX.value = withTiming(targetX, { duration: 230 }, (finished) => {
      if (finished) {
        runOnJS(removeTopCard)(decision);
      }
    });
  };

  const panGesture = Gesture.Pan()
    .enabled(!isTransitioning && Boolean(featured))
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      dragX.value = event.translationX;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.42;
    })
    .onEnd((event) => {
      const projectedX = event.translationX + event.velocityX * 0.16;
      const shouldSwipe = Math.abs(projectedX) > swipeThreshold;

      if (!shouldSwipe) {
        dragX.value = withSpring(0, { damping: 18, stiffness: 190 });
        translateX.value = withSpring(0, { damping: 18, stiffness: 190 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 190 });
        return;
      }

      const decision = projectedX > 0 ? 'liked' : 'passed';
      const targetX = (projectedX > 0 ? 1 : -1) * (width + 140);

      runOnJS(setIsTransitioning)(true);
      dragX.value = withTiming(targetX, { duration: 230 });
      translateY.value = withTiming(event.translationY * 0.28, { duration: 160 });
      translateX.value = withTiming(targetX, { duration: 230 }, (finished) => {
        if (finished) {
          runOnJS(removeTopCard)(decision);
        }
      });
    });

  const tapGesture = Gesture.Tap()
    .enabled(!isTransitioning && Boolean(featured))
    .maxDistance(12)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(openDetail)();
      }
    });

  const cardGesture = Gesture.Exclusive(panGesture, tapGesture);

  const activeCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-12, 0, 12], Extrapolation.CLAMP);

    return {
      zIndex: 3,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const nextCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(dragX.value) / swipeThreshold, 1);

    return {
      zIndex: 1,
      opacity: interpolate(progress, [0, 1], [0.9, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(progress, [0, 1], [12, 0], Extrapolation.CLAMP) },
        { scale: interpolate(progress, [0, 1], [0.955, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const passBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [-swipeThreshold, -12], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '-10deg' },
      { scale: interpolate(dragX.value, [-swipeThreshold, -12], [1, 0.92], Extrapolation.CLAMP) },
    ],
  }));

  const likeBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [12, swipeThreshold], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '10deg' },
      { scale: interpolate(dragX.value, [12, swipeThreshold], [0.92, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar title="Discover" />
      <LocationFilterBar
        location={preferences.campusName}
        activeFilters={activeFilters}
        onMapPress={() => router.push('/map')}
        onFilterPress={() => router.push('/preferences')}
      />

      {loading ? (
        <View style={styles.loadingDeck}>
          <Skeleton height={cardHeight} radius={34} />
          <View style={styles.loadingControls}>
            <Skeleton width={58} height={58} />
            <Skeleton width={58} height={58} />
            <Skeleton width={58} height={58} />
            <Skeleton width={58} height={58} />
          </View>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={hiveSymbol({ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' })}
            title="Listings did not load"
            body={error}
            action={<Button onPress={refresh}>Try again</Button>}
          />
        </View>
      ) : !featured ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={hiveSymbol({ ios: 'checkmark.seal.fill', android: 'check_circle', web: 'check_circle' })}
            title="You're caught up"
            body="Every current match has a decision. Undo the last swipe or review saved places."
            action={
              <View style={styles.emptyActions}>
                <Button variant="secondary" onPress={undo}>
                  Undo
                </Button>
                <Button onPress={() => router.push('/saved')}>Saved</Button>
              </View>
            }
          />
        </View>
      ) : (
        <View style={styles.deck}>
          <View style={[styles.cardStack, { height: cardHeight }]}>
            {nextListing ? (
              <Animated.View pointerEvents="none" style={[styles.cardSlot, nextCardStyle]}>
                <SwipeListingCard listing={nextListing} height={cardHeight} />
              </Animated.View>
            ) : null}

            <GestureDetector gesture={cardGesture}>
              <Animated.View style={[styles.cardSlot, activeCardStyle]}>
                <SwipeListingCard listing={featured} height={cardHeight} />
                <Animated.View style={[styles.decisionBadge, styles.passBadge, passBadgeStyle]}>
                  <ThemedText type="sectionTitle" style={styles.passText}>
                    Skip
                  </ThemedText>
                </Animated.View>
                <Animated.View style={[styles.decisionBadge, styles.likeBadge, likeBadgeStyle]}>
                  <ThemedText type="sectionTitle" style={styles.likeText}>
                    Like
                  </ThemedText>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </View>
          <View style={styles.swipeControls}>
            <SwipeActionButton action="undo" onPress={undo} />
            <SwipeActionButton action="pass" onPress={() => animateDecision('passed')} />
            <SwipeActionButton action="like" onPress={() => animateDecision('liked')} />
            <SwipeActionButton
              action="map"
              onPress={() => router.push({ pathname: '/map', params: { selected: featured.id } })}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: 18,
    gap: Spacing.two,
  },
  deck: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cardStack: {
    position: 'relative',
  },
  cardSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  decisionBadge: {
    position: 'absolute',
    top: Spacing.five,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 3,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 10,
    elevation: 10,
  },
  passBadge: {
    left: Spacing.four,
    borderColor: '#241027',
  },
  likeBadge: {
    right: Spacing.four,
    borderColor: '#64207A',
  },
  passText: {
    color: '#241027',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  likeText: {
    color: '#64207A',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  swipeControls: {
    marginTop: Spacing.two,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  loadingDeck: {
    flex: 1,
    gap: Spacing.two,
  },
  loadingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
