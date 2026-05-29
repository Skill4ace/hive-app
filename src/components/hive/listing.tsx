import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AvatarStack,
  Badge,
  IconButton,
  IconGlyph,
  Pill,
  type IconName,
  hiveSymbol,
} from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Listing = {
  id: string;
  title: string;
  price: string;
  location: string;
  address?: string;
  campus?: string;
  campusDistance?: string;
  campusCommute?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  priceShort?: string;
  available?: string;
  leaseTerm?: string;
  deposit?: string;
  utilities?: string;
  image: string;
  photos?: string[];
  beds: number;
  baths: number;
  bedsLabel?: string;
  bathsLabel?: string;
  amenities: string[];
  match: number;
  status?: 'matched' | 'discussing' | 'saved' | 'viewed';
  mapX?: number;
  mapY?: number;
  overview?: string;
  minRent?: number;
  maxRent?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  distanceMiles?: number;
  moveInDate?: string;
  sourceUrl?: string;
  managerDisplayName?: string;
  availableUnitCount?: number;
  totalUnitCount?: number;
  qualityScore?: number;
};

type ListingPhotoProps = {
  source: string;
  title?: string;
  height?: number;
  overlay?: boolean;
};

export function ListingPhoto({ source, title, height = 220, overlay = true }: ListingPhotoProps) {
  const theme = useTheme();

  return (
    <View style={[styles.photoWrap, { height, backgroundColor: theme.backgroundElement }]}>
      <Image source={{ uri: source }} style={StyleSheet.absoluteFill} contentFit="cover" transition={240} />
      {overlay ? <View style={[styles.photoOverlay, { backgroundColor: theme.imageScrim }]} /> : null}
      {title ? (
        <View style={styles.photoTitle}>
          <ThemedText type="subtitle" style={styles.photoTitleText}>
            {title}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

type MatchBadgeProps = {
  value: number;
  compact?: boolean;
};

export function MatchBadge({ value, compact }: MatchBadgeProps) {
  return (
    <Badge tone="primary">
      {compact ? `${value}%` : `${value}% Search Fit`}
    </Badge>
  );
}

type PriceLabelProps = {
  price: string;
  muted?: boolean;
  inverted?: boolean;
};

export function PriceLabel({ price, muted, inverted }: PriceLabelProps) {
  const hasMonthlySuffix = price !== 'Contact';

  return (
    <View style={styles.priceRow}>
      <ThemedText type="smallBold" style={inverted ? styles.invertedText : undefined}>
        {price}
      </ThemedText>
      {hasMonthlySuffix ? (
        <ThemedText
          type="caption"
          themeColor={inverted ? undefined : muted ? 'textTertiary' : 'textSecondary'}
          style={inverted ? styles.invertedMutedText : undefined}>
          / mo
        </ThemedText>
      ) : null}
    </View>
  );
}

type ListingMetaRowProps = {
  beds: number;
  baths: number;
  amenities?: string[];
  bedsLabel?: string;
  bathsLabel?: string;
  compact?: boolean;
  inverted?: boolean;
};

export function ListingMetaRow({
  beds,
  baths,
  amenities = [],
  bedsLabel,
  bathsLabel,
  compact,
  inverted,
}: ListingMetaRowProps) {
  const theme = useTheme();
  const items: { icon: IconName; label: string }[] = [
    {
      icon: hiveSymbol({ ios: 'bed.double.fill', android: 'bed', web: 'bed' }),
      label: bedsLabel ?? `${beds} Bed${beds === 1 ? '' : 's'}`,
    },
    {
      icon: hiveSymbol({ ios: 'bathtub.fill', android: 'bathtub', web: 'bathtub' }),
      label: bathsLabel ?? `${baths} Bath${baths === 1 ? '' : 's'}`,
    },
    ...amenities.slice(0, compact ? 1 : 2).map((amenity) => ({
      icon: hiveSymbol({
        ios: amenity.toLowerCase().includes('w/d') ? 'washer.fill' : 'sparkles',
        android: amenity.toLowerCase().includes('w/d') ? 'local_laundry_service' : 'auto_awesome',
        web: amenity.toLowerCase().includes('w/d') ? 'local_laundry_service' : 'auto_awesome',
      }),
      label: amenity,
    })),
  ];

  return (
    <View style={styles.metaRow}>
      {items.map((item) => (
        <View key={item.label} style={styles.metaItem}>
          <IconGlyph name={item.icon} color={inverted ? '#FFFFFF' : theme.textSecondary} size={14} />
          <ThemedText
            type="caption"
            themeColor={inverted ? undefined : 'textSecondary'}
            style={inverted ? styles.invertedMutedText : undefined}>
            {compact ? item.label.replace('In-unit ', '') : item.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

type ListingCardProps = {
  listing: Listing;
  variant?: 'hero' | 'grid' | 'row';
  onPress?: () => void;
  saved?: boolean;
  heroHeight?: number;
};

export function ListingCard({ listing, variant = 'grid', onPress, heroHeight = 350 }: ListingCardProps) {
  const theme = useTheme();
  const isHero = variant === 'hero';
  const isRow = variant === 'row';

  if (isRow) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}>
        <ListingPhoto source={listing.image} height={84} overlay={false} />
        <View style={styles.rowCopy}>
          <View style={styles.rowTitleLine}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.flexText}>
              {listing.title}
            </ThemedText>
            {listing.status ? (
              <Pill tone={listing.status === 'discussing' ? 'warning' : 'primary'}>
                {listing.status === 'discussing' ? 'Discussing' : 'Matched'}
              </Pill>
            ) : null}
          </View>
          <PriceLabel price={listing.price} muted />
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {listing.location}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.primary }}>
            {listing.campusDistance ?? `${listing.match}% match`}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isHero && styles.heroCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <View>
        <ListingPhoto
          source={listing.image}
          height={isHero ? heroHeight : 154}
          overlay={isHero}
        />
        {isHero ? (
          <View style={styles.heroInfo}>
            <ThemedText type="subtitle" style={styles.heroTitleText}>
              {listing.title}
            </ThemedText>
            <PriceLabel price={listing.price} inverted />
            <ThemedText type="smallBold" style={styles.heroWhiteText}>
              {listing.location}
            </ThemedText>
            <ListingMetaRow
              beds={listing.beds}
              baths={listing.baths}
              bedsLabel={listing.bedsLabel}
              bathsLabel={listing.bathsLabel}
              amenities={listing.amenities}
              inverted
            />
            <View style={styles.heroBadgeRow}>
              <MatchBadge value={listing.match} />
            </View>
          </View>
        ) : null}
      </View>

      {!isHero ? (
        <View style={styles.cardCopy}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {listing.title}
          </ThemedText>
          <PriceLabel price={listing.price} muted />
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {listing.location}
          </ThemedText>
          <ListingMetaRow
            beds={listing.beds}
            baths={listing.baths}
            bedsLabel={listing.bedsLabel}
            bathsLabel={listing.bathsLabel}
            compact
          />
        </View>
      ) : null}
    </Pressable>
  );
}

type SwipeListingCardProps = {
  listing: Listing;
  height: number;
  onPress?: () => void;
  onImageLoad?: () => void;
};

export function SwipeListingCard({ listing, height, onPress, onImageLoad }: SwipeListingCardProps) {
  const theme = useTheme();
  const chips = [
    listing.bedsLabel ?? `${listing.beds} Beds`,
    listing.bathsLabel ?? `${listing.baths} Bath${listing.baths === 1 ? '' : 's'}`,
    ...listing.amenities.slice(0, 2),
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${listing.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.swipeCard,
        {
          height,
          backgroundColor: theme.surface,
          shadowColor: theme.shadow,
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <Image
        source={{ uri: listing.image }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onLoad={onImageLoad}
      />
      <View style={[styles.swipeScrim, { backgroundColor: 'rgba(19, 8, 23, 0.28)' }]} />
      <View style={styles.swipeBottomShade} />
      <View style={styles.campusPill}>
        <IconGlyph
          name={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
          color="#FFFFFF"
          size={14}
        />
        <ThemedText type="caption" style={styles.campusPillText}>
          {listing.campusDistance ?? 'Near campus'}
        </ThemedText>
      </View>

      <View style={styles.swipeInfo}>
        <ThemedText type="title" style={styles.swipeTitle}>
          {listing.title}
        </ThemedText>
        <View style={styles.swipePriceLine}>
          <PriceLabel price={listing.price} inverted />
          <ThemedText type="smallBold" style={styles.swipeLocation}>
            {listing.location}
          </ThemedText>
        </View>
        <View style={styles.swipeChips}>
          {chips.map((chip) => (
            <View key={chip} style={styles.swipeChip}>
              <ThemedText type="caption" style={styles.swipeChipText}>
                {chip}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

type SwipeActionButtonProps = {
  action: 'filters' | 'map' | 'undo' | 'pass' | 'like';
  badgeCount?: number;
  size?: 'md' | 'lg';
  onPress?: () => void;
};

export function SwipeActionButton({ action, badgeCount, size = 'lg', onPress }: SwipeActionButtonProps) {
  const theme = useTheme();
  const config = {
    filters: {
      icon: hiveSymbol({ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }),
      label: 'Open filters',
      tone: 'neutral' as const,
      selected: false,
    },
    map: {
      icon: hiveSymbol({ ios: 'map.fill', android: 'map', web: 'map' }),
      label: 'Open map',
      tone: 'primary' as const,
      selected: false,
    },
    undo: {
      icon: hiveSymbol({ ios: 'arrow.counterclockwise', android: 'refresh', web: 'refresh' }),
      label: 'Undo',
      tone: 'neutral' as const,
      selected: false,
    },
    pass: {
      icon: hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' }),
      label: 'Pass',
      tone: 'neutral' as const,
      selected: false,
    },
    like: {
      icon: hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' }),
      label: 'Like',
      tone: 'primary' as const,
      selected: false,
    },
  }[action];

  return (
    <View style={styles.actionButtonWrap}>
      <IconButton
        icon={config.icon}
        label={config.label}
        tone={config.tone}
        selected={config.selected}
        size={size}
        onPress={onPress}
      />
      {badgeCount ? (
        <View style={[styles.actionBadge, { backgroundColor: theme.primary }]}>
          <ThemedText type="caption" style={styles.actionBadgeText}>
            {badgeCount}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

type PreferenceSummaryProps = {
  title: string;
  items: { icon: IconName; label: string; value: string }[];
  actionLabel?: string;
};

export function PreferenceSummary({ title, items, actionLabel = 'Edit' }: PreferenceSummaryProps) {
  const theme = useTheme();

  return (
    <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.summaryHeader}>
        <ThemedText type="sectionTitle">{title}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.primary }}>
          {actionLabel}
        </ThemedText>
      </View>
      <View style={styles.summaryList}>
        {items.map((item) => (
          <View key={item.label} style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <IconGlyph name={item.icon} color={theme.textSecondary} size={15} />
              <ThemedText type="caption" themeColor="textSecondary">
                {item.label}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={styles.summaryValue}>
              {item.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

type GroupConsensusRowProps = {
  listing: Listing;
  likes: string;
  status: 'matched' | 'discussing' | 'passed';
  people: { name: string; source?: string }[];
  onPress?: () => void;
};

type SavedListingRowProps = {
  listing: Listing;
  onPress?: () => void;
};

export function SavedListingRow({ listing, onPress }: SavedListingRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Open ${listing.title}` : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.consensus,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <Image source={{ uri: listing.image }} style={styles.consensusImage} contentFit="cover" transition={220} />
      <View style={styles.consensusCopy}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {listing.title}
        </ThemedText>
        <PriceLabel price={listing.price} muted />
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {listing.location}
        </ThemedText>
        <View style={styles.savedRowMeta}>
          <ListingMetaRow
            beds={listing.beds}
            baths={listing.baths}
            bedsLabel={listing.bedsLabel}
            bathsLabel={listing.bathsLabel}
            compact
          />
          <ThemedText type="caption" style={{ color: theme.primary }} numberOfLines={1}>
            {listing.campusDistance}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export function GroupConsensusRow({ listing, likes, status, people, onPress }: GroupConsensusRowProps) {
  const theme = useTheme();
  const statusTone = status === 'matched' ? 'primary' : status === 'discussing' ? 'warning' : 'neutral';
  const statusLabel = status === 'matched' ? 'Matched' : status === 'discussing' ? 'Under discussion' : 'Passed';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Open ${listing.title}` : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.consensus,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <Image source={{ uri: listing.image }} style={styles.consensusImage} contentFit="cover" transition={220} />
      <View style={styles.consensusCopy}>
        <View style={styles.consensusTop}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flexText}>
            {listing.title}
          </ThemedText>
          <Pill tone={statusTone}>{statusLabel}</Pill>
        </View>
        <PriceLabel price={listing.price} muted />
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {listing.location}
        </ThemedText>
        <View style={styles.consensusBottom}>
          <AvatarStack people={people} size={26} />
          <ThemedText type="caption" style={{ color: theme.primary }}>
            {likes} likes · {listing.campusDistance ?? `${listing.match}% match`}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFill,
  },
  photoTitle: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.four,
  },
  photoTitleText: {
    color: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  invertedText: {
    color: '#FFFFFF',
  },
  invertedMutedText: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  swipeCard: {
    borderRadius: 34,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  swipeScrim: {
    ...StyleSheet.absoluteFill,
  },
  swipeBottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '52%',
    backgroundColor: 'rgba(18, 8, 22, 0.48)',
  },
  campusPill: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    minHeight: 32,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(36, 16, 39, 0.58)',
  },
  campusPillText: {
    color: '#FFFFFF',
  },
  swipeInfo: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.five,
    gap: Spacing.one,
  },
  swipeTitle: {
    color: '#FFFFFF',
  },
  swipePriceLine: {
    gap: 1,
  },
  swipeLocation: {
    color: 'rgba(255,255,255,0.9)',
  },
  swipeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  swipeChip: {
    minHeight: 30,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  swipeChipText: {
    color: '#FFFFFF',
  },
  actionButtonWrap: {
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
  },
  heroCard: {
    borderRadius: Radius.xxl,
  },
  heroInfo: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    gap: Spacing.one,
  },
  heroTitleText: {
    color: '#FFFFFF',
  },
  heroWhiteText: {
    color: '#FFFFFF',
  },
  heroBadgeRow: {
    paddingTop: Spacing.one,
    alignItems: 'flex-start',
  },
  cardCopy: {
    padding: Spacing.three,
    gap: 3,
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  flexText: {
    flex: 1,
  },
  summary: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  summaryList: {
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
  consensus: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  consensusImage: {
    width: 78,
    height: 78,
    borderRadius: Radius.md,
  },
  consensusCopy: {
    flex: 1,
    gap: 2,
  },
  consensusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  consensusBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  savedRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
});
