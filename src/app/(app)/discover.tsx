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
  const [, setHistory] = useState<number[]>([]);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const featured = demoListings[activeIndex];
  const cardHeight = Math.min(575, Math.max(455, height * 0.58));
  const swipeThreshold = Math.min(width * 0.26, 128);

  const moveNext = () => {
    setHistory((previous) => [...previous, activeIndex]);
    setActiveIndex((current) => (current + 1) % demoListings.length);
  };

  const undo = () => {
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

  const commitSwipe = () => {
    moveNext();
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
      translateX.value = withTiming(direction * (width + 140), { duration: 190 }, (finished) => {
        if (!finished) {
          return;
        }

        translateX.value = 0;
        translateY.value = 0;
        runOnJS(commitSwipe)();
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

  const passBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, -24], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '-10deg' },
      { scale: interpolate(translateX.value, [-swipeThreshold, -24], [1, 0.92], Extrapolation.CLAMP) },
    ],
  }));

  const likeBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [24, swipeThreshold], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '10deg' },
      { scale: interpolate(translateX.value, [24, swipeThreshold], [0.92, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar title="Discover" />
      <LocationFilterBar location="UCLA" activeFilters={2} />

      <View style={styles.deck}>
        <GestureDetector gesture={panGesture}>
          <Animated.View key={featured.id} style={animatedCardStyle}>
            <SwipeListingCard
              listing={featured}
              height={cardHeight}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: featured.id } })}
            />
            <Animated.View style={[styles.decisionBadge, styles.passBadge, passBadgeStyle]}>
              <ThemedText type="sectionTitle" style={styles.passText}>
                Pass
              </ThemedText>
            </Animated.View>
            <Animated.View style={[styles.decisionBadge, styles.likeBadge, likeBadgeStyle]}>
              <ThemedText type="sectionTitle" style={styles.likeText}>
                Like
              </ThemedText>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
        <View style={styles.swipeControls}>
          <SwipeActionButton action="undo" onPress={undo} />
          <SwipeActionButton action="pass" onPress={moveNext} />
          <SwipeActionButton action="like" onPress={moveNext} />
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
  decisionBadge: {
    position: 'absolute',
    top: Spacing.four,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 16, 39, 0.72)',
  },
  passBadge: {
    left: Spacing.four,
    borderColor: '#FFFFFF',
  },
  likeBadge: {
    right: Spacing.four,
    borderColor: '#FFFFFF',
  },
  passText: {
    color: '#FFFFFF',
  },
  likeText: {
    color: '#FFFFFF',
  },
  swipeControls: {
    marginTop: Spacing.two,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
