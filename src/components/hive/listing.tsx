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
  image: string;
  beds: number;
  baths: number;
  amenities: string[];
  match: number;
  status?: 'matched' | 'discussing' | 'saved' | 'viewed';
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
      {compact ? `${value}%` : `${value}% Group Match`}
    </Badge>
  );
}

type PriceLabelProps = {
  price: string;
  muted?: boolean;
  inverted?: boolean;
};

export function PriceLabel({ price, muted, inverted }: PriceLabelProps) {
  return (
    <View style={styles.priceRow}>
      <ThemedText type="smallBold" style={inverted ? styles.invertedText : undefined}>
        {price}
      </ThemedText>
      <ThemedText
        type="caption"
        themeColor={inverted ? undefined : muted ? 'textTertiary' : 'textSecondary'}
        style={inverted ? styles.invertedMutedText : undefined}>
        / mo
      </ThemedText>
    </View>
  );
}

type ListingMetaRowProps = {
  beds: number;
  baths: number;
  amenities?: string[];
  compact?: boolean;
  inverted?: boolean;
};

export function ListingMetaRow({ beds, baths, amenities = [], compact, inverted }: ListingMetaRowProps) {
  const theme = useTheme();
  const items: { icon: IconName; label: string }[] = [
    {
      icon: hiveSymbol({ ios: 'bed.double.fill', android: 'bed', web: 'bed' }),
      label: `${beds} Bed${beds === 1 ? '' : 's'}`,
    },
    {
      icon: hiveSymbol({ ios: 'bathtub.fill', android: 'bathtub', web: 'bathtub' }),
      label: `${baths} Bath${baths === 1 ? '' : 's'}`,
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

export function ListingCard({ listing, variant = 'grid', onPress, saved, heroHeight = 350 }: ListingCardProps) {
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
            {listing.match}% match
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
        <View style={styles.saveButton}>
          <IconButton
            icon={hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' })}
            label={saved ? 'Saved' : 'Save listing'}
            selected={saved}
            tone="accent"
            size="sm"
          />
        </View>
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
          <ListingMetaRow beds={listing.beds} baths={listing.baths} compact />
        </View>
      ) : null}
    </Pressable>
  );
}

type SwipeActionButtonProps = {
  action: 'pass' | 'star' | 'like';
  onPress?: () => void;
};

export function SwipeActionButton({ action, onPress }: SwipeActionButtonProps) {
  const config = {
    pass: {
      icon: hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' }),
      label: 'Pass',
      tone: 'neutral' as const,
    },
    star: {
      icon: hiveSymbol({ ios: 'star.fill', android: 'star', web: 'star' }),
      label: 'Star',
      tone: 'gold' as const,
    },
    like: {
      icon: hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' }),
      label: 'Like',
      tone: 'accent' as const,
    },
  }[action];

  return <IconButton icon={config.icon} label={config.label} tone={config.tone} size="lg" onPress={onPress} />;
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
};

export function GroupConsensusRow({ listing, likes, status, people }: GroupConsensusRowProps) {
  const theme = useTheme();
  const statusTone = status === 'matched' ? 'primary' : status === 'discussing' ? 'warning' : 'neutral';
  const statusLabel = status === 'matched' ? 'Matched' : status === 'discussing' ? 'Under discussion' : 'Passed';

  return (
    <View style={[styles.consensus, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
            {likes} likes · {listing.match}% match
          </ThemedText>
        </View>
      </View>
    </View>
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
  heroCard: {
    borderRadius: Radius.xxl,
  },
  saveButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
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
});
