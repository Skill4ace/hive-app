import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { Screen } from '@/components/hive/primitives';
import { SwipeActionButton, SwipeListingCard } from '@/components/hive/listing';
import { Spacing } from '@/constants/theme';
import { demoListings } from '@/data/module-one-demo';
import { ThemedText } from '@/components/themed-text';

export default function DiscoverScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [coverIndex, setCoverIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, setHistory] = useState<number[]>([]);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const coverOpacity = useSharedValue(0);
  const revealPending = useSharedValue(0);
  const nextIndex = (activeIndex + 1) % demoListings.length;
  const featured = demoListings[activeIndex];
  const nextListing = demoListings[nextIndex];
  const coverListing = demoListings[coverIndex ?? nextIndex];
  const cardHeight = Math.min(575, Math.max(455, height * 0.58));
  const swipeThreshold = Math.min(width * 0.26, 128);

  const resetMotion = () => {
    translateX.value = 0;
    translateY.value = 0;
    dragX.value = 0;
    coverOpacity.value = 0;
    revealPending.value = 0;
  };

  const resetDeckFromIndex = (index: number) => {
    resetMotion();
    setCoverIndex(null);
    setIsTransitioning(false);
    setActiveIndex(index);
  };

  const undo = () => {
    if (isTransitioning) {
      return;
    }

    setHistory((previous) => {
      const prior = previous.at(-1);

      if (prior === undefined) {
        resetDeckFromIndex((activeIndex - 1 + demoListings.length) % demoListings.length);
        return previous;
      }

      resetDeckFromIndex(prior);
      return previous.slice(0, -1);
    });
  };

  const beginTransition = () => {
    setIsTransitioning(true);
  };

  const finishTransition = () => {
    setCoverIndex(null);
    setIsTransitioning(false);
  };

  const revealCover = () => {
    coverOpacity.value = withTiming(0, { duration: 110 }, (finished) => {
      if (finished) {
        runOnJS(finishTransition)();
      }
    });
  };

  const finishSwipe = () => {
    const promotedIndex = nextIndex;

    // Raise the opaque cover (showing the promoted listing) on top of the deck
    // before anything reshuffles, so the index swap underneath is never visible.
    // The active card keeps showing its old image until the promoted one decodes,
    // so we only lift the cover once that image has actually loaded — never
    // exposing a stale frame or a transparent half-loaded card.
    coverOpacity.value = 1;
    revealPending.value = 1;
    setCoverIndex(promotedIndex);
    setIsTransitioning(true);
    setHistory((previous) => [...previous, activeIndex]);
    setActiveIndex(promotedIndex);
    translateX.value = 0;
    translateY.value = 0;
    dragX.value = 0;

    // Safety net: if onLoad never fires (cache hit edge cases, load error),
    // reveal anyway so the deck can never get stuck behind the cover.
    setTimeout(() => {
      if (revealPending.value === 1) {
        revealPending.value = 0;
        revealCover();
      }
    }, 450);
  };

  // Fired by the active card's image once the promoted listing has decoded and
  // is on screen under the cover. That is the safe moment to fade the cover.
  const handleActiveImageLoad = () => {
    if (revealPending.value !== 1) {
      return;
    }

    revealPending.value = 0;
    revealCover();
  };

  const openDetail = () => {
    router.push({ pathname: '/listing/[id]', params: { id: featured.id } });
  };

  const animateDecision = (direction: 1 | -1) => {
    if (isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    const targetX = direction * (width + 140);
    dragX.value = withTiming(targetX, { duration: 230 });
    translateY.value = withTiming(-8, { duration: 120 });
    translateX.value = withTiming(targetX, { duration: 230 }, (finished) => {
      if (!finished) {
        return;
      }

      runOnJS(finishSwipe)();
    });
  };

  const panGesture = Gesture.Pan()
    .enabled(!isTransitioning)
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

      runOnJS(beginTransition)();
      const direction = projectedX > 0 ? 1 : -1;
      const targetX = direction * (width + 140);
      dragX.value = withTiming(targetX, { duration: 230 });
      translateY.value = withTiming(event.translationY * 0.28, { duration: 160 });
      translateX.value = withTiming(targetX, { duration: 230 }, (finished) => {
        if (finished) {
          runOnJS(finishSwipe)();
        }
      });
    });

  // A discrete tap opens the listing detail. Composing it with the pan via
  // Exclusive means the tap is only recognised when the pan never activates,
  // so swiping moves to the next card without ever opening the detail view.
  const tapGesture = Gesture.Tap()
    .enabled(!isTransitioning)
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

  const coverCardStyle = useAnimatedStyle(() => ({
    zIndex: 4,
    opacity: coverOpacity.value,
  }));

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
      <LocationFilterBar location="UCLA" activeFilters={2} />

      <View style={styles.deck}>
        <View style={[styles.cardStack, { height: cardHeight }]}>
          <Animated.View pointerEvents="none" style={[styles.cardSlot, nextCardStyle]}>
            <SwipeListingCard listing={nextListing} height={cardHeight} />
          </Animated.View>

          <GestureDetector gesture={cardGesture}>
            <Animated.View style={[styles.cardSlot, activeCardStyle]}>
              <SwipeListingCard listing={featured} height={cardHeight} onImageLoad={handleActiveImageLoad} />
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

          <Animated.View pointerEvents="none" style={[styles.cardSlot, coverCardStyle]}>
            <SwipeListingCard listing={coverListing} height={cardHeight} />
          </Animated.View>
        </View>
        <View style={styles.swipeControls}>
          <SwipeActionButton action="undo" onPress={undo} />
          <SwipeActionButton action="pass" onPress={() => animateDecision(-1)} />
          <SwipeActionButton action="like" onPress={() => animateDecision(1)} />
          <SwipeActionButton
            action="map"
            onPress={() => router.push({ pathname: '/map', params: { selected: featured.id } })}
          />
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
});
