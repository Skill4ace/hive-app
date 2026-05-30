import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

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
        <CardDeck />
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

function CardDeck() {
  // Back-to-front: the last entry renders on top, so peel layers reveal a
  // fanned deck. Transforms are static — this is a poster, not the live swiper.
  return (
    <View style={styles.deck}>
      <PreviewCard listing={PREVIEW_DECK[2]} style={styles.cardBack} dimmed />
      <PreviewCard listing={PREVIEW_DECK[1]} style={styles.cardMid} dimmed />
      <PreviewCard listing={PREVIEW_DECK[0]} style={styles.cardFront} showHints />
    </View>
  );
}

function PreviewCard({
  listing,
  style,
  dimmed,
  showHints,
}: {
  listing: PreviewListing;
  style: object;
  dimmed?: boolean;
  showHints?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: listing.tint, shadowColor: theme.shadow }, style]}>
      <Image source={{ uri: listing.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
      <LinearGradient
        colors={['transparent', 'rgba(17, 7, 21, 0.55)', 'rgba(17, 7, 21, 0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.cardGradient}
      />
      {dimmed ? <View style={styles.cardDim} /> : null}

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

      {showHints ? (
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
    </View>
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
  cardBack: {
    transform: [{ rotate: '-10deg' }, { translateX: -26 }, { translateY: 8 }, { scale: 0.92 }],
  },
  cardMid: {
    transform: [{ rotate: '9deg' }, { translateX: 24 }, { translateY: 2 }, { scale: 0.96 }],
  },
  cardFront: {
    transform: [{ rotate: '-2deg' }],
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
