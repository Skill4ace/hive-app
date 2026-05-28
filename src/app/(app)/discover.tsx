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
  const [isCommitting, setIsCommitting] = useState(false);
  const [, setHistory] = useState<number[]>([]);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const promotedProgress = useSharedValue(0);
  const featured = demoListings[activeIndex];
  const nextListing = demoListings[(activeIndex + 1) % demoListings.length];
  const thirdListing = demoListings[(activeIndex + 2) % demoListings.length];
  const cardHeight = Math.min(575, Math.max(455, height * 0.58));
  const swipeThreshold = Math.min(width * 0.26, 128);

  const undo = () => {
    translateX.value = 0;
    translateY.value = 0;
    promotedProgress.value = 0;

    setHistory((previous) => {
      const prior = previous.at(-1);

      if (prior === undefined) {
        setActiveIndex((current) => (current - 1 + demoListings.length) % demoListings.length);
        return previous;
      }

      setActiveIndex(prior);
      return previous.slice(0, -1);
    });
  };

  const finishSwipe = () => {
    setIsCommitting(true);
    promotedProgress.value = 1;

    requestAnimationFrame(() => {
      translateX.value = 0;
      translateY.value = 0;
      promotedProgress.value = 0;
      setHistory((previous) => [...previous, activeIndex]);
      setActiveIndex((current) => (current + 1) % demoListings.length);
      setIsCommitting(false);
    });
  };

  const animateDecision = (direction: 1 | -1) => {
    translateY.value = withTiming(-8, { duration: 120 });
    translateX.value = withTiming(direction * (width + 140), { duration: 230 }, (finished) => {
      if (!finished) {
        return;
      }

      runOnJS(finishSwipe)();
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.42;
    })
    .onEnd((event) => {
      const projectedX = event.translationX + event.velocityX * 0.16;
      const shouldSwipe = Math.abs(projectedX) > swipeThreshold;

      if (!shouldSwipe) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 190 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 190 });
        return;
      }

      const direction = projectedX > 0 ? 1 : -1;
      translateY.value = withTiming(event.translationY * 0.28, { duration: 160 });
      translateX.value = withTiming(direction * (width + 140), { duration: 230 }, (finished) => {
        if (!finished) {
          return;
        }

        runOnJS(finishSwipe)();
      });
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width, 0, width],
      [-12, 0, 12],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const nextCardStyle = useAnimatedStyle(() => {
    const progress = Math.max(Math.min(Math.abs(translateX.value) / swipeThreshold, 1), promotedProgress.value);

    return {
      opacity: interpolate(progress, [0, 1], [0.9, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(progress, [0, 1], [12, 0], Extrapolation.CLAMP) },
        { scale: interpolate(progress, [0, 1], [0.955, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const passBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, -12], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '-10deg' },
      { scale: interpolate(translateX.value, [-swipeThreshold, -12], [1, 0.92], Extrapolation.CLAMP) },
    ],
  }));

  const likeBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [12, swipeThreshold], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '10deg' },
      { scale: interpolate(translateX.value, [12, swipeThreshold], [0.92, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar title="Discover" />
      <LocationFilterBar location="UCLA" activeFilters={2} />

      <View style={styles.deck}>
        <View style={[styles.cardStack, { height: cardHeight }]}>
          <Animated.View pointerEvents="none" style={[styles.stackedCard, styles.thirdCard]}>
            <SwipeListingCard listing={thirdListing} height={cardHeight} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.stackedCard, nextCardStyle]}>
            <SwipeListingCard listing={nextListing} height={cardHeight} />
          </Animated.View>
          <GestureDetector gesture={panGesture}>
            <Animated.View
              key={featured.id}
              style={[styles.activeCard, isCommitting && styles.hiddenActiveCard, animatedCardStyle]}>
              <SwipeListingCard
                listing={featured}
                height={cardHeight}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: featured.id } })}
              />
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
  stackedCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  thirdCard: {
    opacity: 0.34,
    transform: [{ translateY: 23 }, { scale: 0.92 }],
    zIndex: 0,
  },
  activeCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 3,
  },
  hiddenActiveCard: {
    opacity: 0,
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
