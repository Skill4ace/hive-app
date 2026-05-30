import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button, IconGlyph, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PreviewListing = {
  photo: string;
  tint: string;
  title: string;
  price: string;
  walk: string;
  chips: string[];
};

// Lightweight, self-contained previews for the welcome hero. Real listings load
// from Supabase at runtime; these just need to read as "apartments near campus"
// the instant the app opens, so each card has a tint fallback under its photo.
const PREVIEW_DECK: PreviewListing[] = [
  {
    photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=640&q=70',
    tint: '#3A1C42',
    title: 'Sunlit Westwood',
    price: '$1,450',
    walk: '8 min walk',
    chips: ['2 Beds', '1 Bath', 'In-unit W/D'],
  },
  {
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=640&q=70',
    tint: '#2C1733',
    title: 'Gayley Ave Studio',
    price: '$1,180',
    walk: '5 min walk',
    chips: ['Studio', '1 Bath', 'Furnished'],
  },
  {
    photo: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=640&q=70',
    tint: '#241027',
    title: 'Kelton 3bd w/ patio',
    price: '$2,300',
    walk: '11 min walk',
    chips: ['3 Beds', '2 Bath', 'Parking'],
  },
];

export default function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <View style={styles.logoChip}>
            <Image
              source={require('../../../assets/images/hivelogoappicon.png')}
              style={styles.logo}
              contentFit="cover"
            />
          </View>
          <ThemedText type="display" style={[styles.wordmark, { color: theme.text }]}>
            Hive
          </ThemedText>
        </View>
        <ThemedText type="label" themeColor="textTertiary" style={styles.brandTagline}>
          Find a home near campus
        </ThemedText>
      </View>

      <View style={styles.heroArea}>
        <HeroDeck />
      </View>

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
          Swipe apartments near campus, then see what your group agrees on.
        </ThemedText>
        <Button
          fullWidth
          rightIcon={hiveSymbol({ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' })}
          onPress={() => router.replace('/onboarding')}>
          Get started
        </Button>
      </View>
    </Screen>
  );
}

// Per-slot resting transforms — index 0 = front, 1 = mid, 2 = back. The deck
// interpolates a card's live transform from its (animated) slot position so a
// promotion smoothly springs mid -> front and back -> mid.
const SLOT_ROTATE = [-2, 9, -10];
const SLOT_TX = [0, 24, -26];
const SLOT_TY = [0, 2, 8];
const SLOT_SCALE = [1, 0.96, 0.92];
const SLOT_INPUT = [0, 1, 2];

// Springy enough to overshoot a touch on settle — that's the "bounce" on rest.
const SETTLE_SPRING = { damping: 11, stiffness: 150, mass: 0.8 };
const PROMOTE_SPRING = { damping: 15, stiffness: 160, mass: 0.9 };

type DeckCard = { key: number; listingIndex: number };

function HeroDeck() {
  const { width } = useWindowDimensions();
  // cards[0] is the front card. Swiping drops it and re-adds its listing at the
  // back with a fresh key, so the deck loops forever.
  const [cards, setCards] = useState<DeckCard[]>([
    { key: 0, listingIndex: 0 },
    { key: 1, listingIndex: 1 },
    { key: 2, listingIndex: 2 },
  ]);
  const nextKey = useRef(3);
  const idle = useSharedValue(0);

  // A slow, low-amplitude float on the front card — just enough life to read as
  // "interactive" without being distracting.
  useEffect(() => {
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(idle);
  }, [idle]);

  const handleSwiped = useCallback(() => {
    // The fresh key remounts the recycled card cleanly at rest (no stale drag),
    // which is what keeps the swipe loop simple and flash-free.
    setCards((current) => {
      const [front, ...rest] = current;
      return [...rest, { key: nextKey.current++, listingIndex: front.listingIndex }];
    });
  }, []);

  return (
    <View style={styles.deck}>
      {cards.map((card, position) => (
        <HeroCard
          key={card.key}
          listing={PREVIEW_DECK[card.listingIndex]}
          position={position}
          isFront={position === 0}
          width={width}
          idle={idle}
          onSwiped={handleSwiped}
        />
      ))}
    </View>
  );
}

type HeroCardProps = {
  listing: PreviewListing;
  position: number;
  isFront: boolean;
  width: number;
  idle: SharedValue<number>;
  onSwiped: () => void;
};

function HeroCard({ listing, position, isFront, width, idle, onSwiped }: HeroCardProps) {
  const theme = useTheme();
  // Each card owns its own motion. slot is mutated only here (in the effect);
  // dragX/dragY/locked only in the gesture — kept separate so the linter's
  // immutability rule is satisfied and the two never fight over a value.
  const slot = useSharedValue(position);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const locked = useSharedValue(false);

  useEffect(() => {
    // Cards only ever move up the stack (mid -> front, back -> mid); recycled
    // cards remount fresh at the back. Spring toward the slot we now occupy.
    slot.value = withSpring(position, PROMOTE_SPRING);
    // slot is a stable useSharedValue ref; only `position` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const threshold = Math.min(width * 0.22, 120);

  const pan = Gesture.Pan()
    .enabled(isFront)
    .onUpdate((event) => {
      if (locked.value) return;
      dragX.value = event.translationX;
      dragY.value = event.translationY * 0.4;
    })
    .onEnd((event) => {
      if (locked.value) return;
      const projected = event.translationX + event.velocityX * 0.16;

      if (Math.abs(projected) > threshold) {
        locked.value = true;
        const direction = projected > 0 ? 1 : -1;
        dragY.value = withTiming(dragY.value - 12, { duration: 160 });
        dragX.value = withTiming(direction * (width + 220), { duration: 240 }, (finished) => {
          if (finished) runOnJS(onSwiped)();
        });
        return;
      }

      dragX.value = withSpring(0, SETTLE_SPRING);
      dragY.value = withSpring(0, SETTLE_SPRING);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const p = slot.value;
    const baseRotate = interpolate(p, SLOT_INPUT, SLOT_ROTATE);
    const tx = interpolate(p, SLOT_INPUT, SLOT_TX);
    const ty = interpolate(p, SLOT_INPUT, SLOT_TY);
    const scale = interpolate(p, SLOT_INPUT, SLOT_SCALE);

    const dx = isFront ? dragX.value : 0;
    const dy = isFront ? dragY.value : 0;
    const dragRotate = isFront
      ? interpolate(dragX.value, [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)
      : 0;
    const floatY = isFront ? interpolate(idle.value, [0, 1], [0, -7]) : 0;
    const floatRotate = isFront ? interpolate(idle.value, [0, 1], [0, 1.1]) : 0;

    return {
      transform: [
        { translateX: tx + dx },
        { translateY: ty + dy + floatY },
        { rotate: `${baseRotate + dragRotate + floatRotate}deg` },
        { scale },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: listing.tint, shadowColor: theme.shadow, zIndex: 2 - position },
          animatedStyle,
        ]}>
        <Image source={{ uri: listing.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
        <LinearGradient
          colors={['transparent', 'rgba(17, 7, 21, 0.55)', 'rgba(17, 7, 21, 0.9)']}
          locations={[0, 0.5, 1]}
          style={styles.cardGradient}
        />
        {isFront ? null : <View style={styles.cardDim} />}

        <View style={styles.walkPill}>
          <IconGlyph
            name={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
            color="#FFFFFF"
            size={13}
          />
          <ThemedText type="caption" style={styles.walkPillText}>
            {listing.walk}
          </ThemedText>
        </View>

        <View style={styles.cardInfo}>
          <ThemedText type="subtitle" style={styles.cardTitle} numberOfLines={1}>
            {listing.title}
          </ThemedText>
          <View style={styles.priceRow}>
            <ThemedText type="smallBold" style={styles.cardPrice}>
              {listing.price}
            </ThemedText>
            <ThemedText type="caption" style={styles.cardPriceUnit}>
              / mo
            </ThemedText>
          </View>
          <View style={styles.chipRow}>
            {listing.chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <ThemedText type="caption" style={styles.chipText}>
                  {chip}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {isFront ? (
          <View style={styles.hintRow}>
            <View style={[styles.hint, styles.hintSkip]}>
              <IconGlyph
                name={hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' })}
                color="#241027"
                size={20}
              />
            </View>
            <View style={[styles.hint, styles.hintLike, { backgroundColor: theme.primary }]}>
              <IconGlyph
                name={hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' })}
                color="#FFFFFF"
                size={20}
              />
            </View>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const CARD_WIDTH = 272;
const CARD_HEIGHT = 462;

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  brandBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  logoChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.soft,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    fontSize: 42,
    // Avenir Next needs ~1.2x leading at this size. A lineHeight equal to the
    // fontSize is too tight and shears the glyph tops/bottoms, so give it room.
    lineHeight: 50,
    // With a roomy line box, a small downward nudge optically centers the
    // (descender-less) "Hive" against the 40px logo without any clipping.
    transform: [{ translateY: 3 }],
  },
  brandTagline: {
    letterSpacing: 1.5,
  },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deck: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    ...Shadows.floating,
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '66%',
  },
  cardDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 9, 24, 0.2)',
  },
  walkPill: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    minHeight: 28,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(36, 16, 39, 0.6)',
  },
  walkPillText: {
    color: '#FFFFFF',
  },
  cardInfo: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 84,
    gap: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  cardPrice: {
    color: '#FFFFFF',
  },
  cardPriceUnit: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  chip: {
    minHeight: 26,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  chipText: {
    color: '#FFFFFF',
  },
  hintRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  hint: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  hintSkip: {
    backgroundColor: '#FFFFFF',
  },
  hintLike: {
    // backgroundColor set inline from theme.primary
  },
  footer: {
    gap: Spacing.four,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    lineHeight: 23,
    letterSpacing: 0.1,
  },
});
