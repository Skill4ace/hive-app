/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { AppTopBar } from '@/components/hive/app-shell';
import {
  SwipeActionButton,
  SwipeListingCard,
  SWIPE_CARD_IMAGE_TRANSITION,
  type Listing,
} from '@/components/hive/listing';
import { Button, EmptyState, IconButton, Screen, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRealListings } from '@/hooks/use-real-listings';
import { useHiveAppState, type ListingDecision } from '@/lib/hive-state';

export default function DiscoverScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const { decisions, recordDecision, undoDecision } = useHiveAppState();
  const { data: listings, loading, error, refresh } = useRealListings();
  const [deck, setDeck] = useState<Listing[]>([]);
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [coverListing, setCoverListing] = useState<Listing | null>(null);
  const activeCardRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const coverOpacity = useSharedValue(0);
  const revealPending = useSharedValue(0);
  const featured = deck[0];
  const nextListing = deck[1];
  const compactActions = width < 390;
  const actionButtonSize = compactActions ? 'md' : 'lg';
  const cardHeight = Math.min(
    compactActions ? 540 : 650,
    Math.max(compactActions ? 470 : 500, height * (compactActions ? 0.6 : 0.66)),
  );
  const cardFrameX = useSharedValue(0);
  const cardFrameY = useSharedValue(0);
  const cardFrameWidth = useSharedValue(1);
  const cardFrameHeight = useSharedValue(cardHeight);
  const swipeThreshold = Math.min(width * 0.26, 128);
  const activePhotoIndex = featured ? (photoIndexes[featured.id] ?? 0) : 0;
  const nextPhotoIndex = nextListing ? (photoIndexes[nextListing.id] ?? 0) : 0;
  const coverPhotoIndex = coverListing ? (photoIndexes[coverListing.id] ?? 0) : 0;
  const resetMotion = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    dragX.value = 0;
    coverOpacity.value = 0;
    revealPending.value = 0;
    setCoverListing(null);
    setIsTransitioning(false);
  }, [coverOpacity, dragX, revealPending, translateX, translateY]);
  // The deck is derived from the data + decisions (so Undo re-adds cards).
  // Motion is intentionally NOT reset here — that would yank an in-flight
  // cover transition out from under itself when recordDecision updates
  // `decisions`. resetMotion is driven explicitly instead.
  useEffect(() => {
    setDeck(listings.filter((listing) => !decisions[listing.id]));
  }, [decisions, listings]);

  // Warm the photo cache for the active card only, so tapping through its
  // carousel is instant instead of waiting on a cold fetch per photo. These are
  // static Supabase Storage/CDN assets (no DB query), and we deliberately skip
  // the next card to avoid eagerly downloading photos for a card that may be
  // swiped away unseen.
  useEffect(() => {
    if (!featured) return;

    const urls = (featured.photos?.length ? featured.photos : [featured.image]).filter(Boolean);
    if (urls.length > 1) {
      Image.prefetch(urls);
    }
  }, [featured]);

  const finishTransition = () => {
    setCoverListing(null);
    setIsTransitioning(false);
  };

  const revealCover = () => {
    coverOpacity.value = withTiming(0, { duration: 110 }, (finished) => {
      if (finished) {
        runOnJS(finishTransition)();
      }
    });
  };

  // Fired by the active card once its (newly promoted) image has decoded. The
  // active card crossfades from the swiped-away photo to the promoted one over
  // SWIPE_CARD_IMAGE_TRANSITION ms, so hold the opaque cover until that fade
  // settles — otherwise lifting the mask exposes the outgoing frame.
  const handleActiveImageLoad = () => {
    if (revealPending.value !== 1) return;
    revealPending.value = 0;
    setTimeout(revealCover, SWIPE_CARD_IMAGE_TRANSITION);
  };

  const removeTopCard = (decision: ListingDecision) => {
    if (!featured) return;

    const promoted = deck[1];
    recordDecision(featured.id, decision, featured.match);

    if (!promoted) {
      setDeck((current) => current.slice(1));
      resetMotion();
      return;
    }

    // Drop an opaque cover showing the promoted card (its image is already
    // warm from the peek slot) so the active card's source-swap is hidden,
    // then snap the active card back to center underneath it.
    setCoverListing(promoted);
    coverOpacity.value = 1;
    revealPending.value = 1;
    setDeck((current) => current.slice(1));
    translateX.value = 0;
    translateY.value = 0;
    dragX.value = 0;

    // Safety net: reveal even if onLoad never fires (cached image / no source
    // change between adjacent listings).
    setTimeout(() => {
      if (revealPending.value === 1) {
        revealPending.value = 0;
        revealCover();
      }
    }, 500);
  };

  const undo = () => {
    if (isTransitioning) return;
    undoDecision();
  };

  const openDetail = () => {
    if (!featured || isTransitioning) return;
    router.push({ pathname: '/listing/[id]', params: { id: featured.id } });
  };

  const getPhotoCount = (listing: Listing) => {
    return listing.photos?.length ? listing.photos.length : listing.image ? 1 : 0;
  };

  const changeFeaturedPhoto = (direction: 1 | -1) => {
    if (!featured || isTransitioning) return;

    const photoCount = getPhotoCount(featured);
    if (photoCount <= 1) return;

    setPhotoIndexes((current) => {
      const currentIndex = current[featured.id] ?? 0;

      return {
        ...current,
        [featured.id]: (currentIndex + direction + photoCount) % photoCount,
      };
    });
  };

  const updateActiveCardFrame = () => {
    activeCardRef.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      cardFrameX.value = x;
      cardFrameY.value = y;
      cardFrameWidth.value = measuredWidth || 1;
      cardFrameHeight.value = measuredHeight || cardHeight;
    });
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
    .maxDistance(10)
    .onEnd((event, success) => {
      if (success) {
        const relativeX = event.absoluteX - cardFrameX.value;
        const relativeY = event.absoluteY - cardFrameY.value;

        if (relativeY <= cardFrameHeight.value * 0.62) {
          runOnJS(changeFeaturedPhoto)(relativeX < cardFrameWidth.value / 2 ? -1 : 1);
        } else {
          runOnJS(openDetail)();
        }
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
      <AppTopBar
        title="Discover"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' })}
            label="Edit preferences"
            onPress={() => router.push('/preferences')}
          />
        }
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
                <SwipeListingCard listing={nextListing} height={cardHeight} photoIndex={nextPhotoIndex} />
              </Animated.View>
            ) : null}

            <GestureDetector gesture={cardGesture}>
              <Animated.View
                ref={activeCardRef}
                collapsable={false}
                onLayout={updateActiveCardFrame}
                style={[styles.cardSlot, activeCardStyle]}>
                <SwipeListingCard
                  listing={featured}
                  height={cardHeight}
                  photoIndex={activePhotoIndex}
                  onImageLoad={handleActiveImageLoad}
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

            {coverListing ?? nextListing ? (
              <Animated.View pointerEvents="none" style={[styles.cardSlot, coverCardStyle]}>
                <SwipeListingCard
                  listing={(coverListing ?? nextListing)!}
                  height={cardHeight}
                  photoIndex={coverListing ? coverPhotoIndex : nextPhotoIndex}
                />
              </Animated.View>
            ) : null}
          </View>
          <View style={[styles.swipeControls, compactActions && styles.swipeControlsCompact]}>
            <SwipeActionButton action="undo" size={actionButtonSize} onPress={undo} />
            <SwipeActionButton action="pass" size={actionButtonSize} onPress={() => animateDecision('passed')} />
            <SwipeActionButton action="like" size={actionButtonSize} onPress={() => animateDecision('liked')} />
            <SwipeActionButton
              action="map"
              size={actionButtonSize}
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
  swipeControlsCompact: {
    gap: Spacing.one,
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
