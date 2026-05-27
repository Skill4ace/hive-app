import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, Pill, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ListingMetaRow, MatchBadge, PriceLabel } from '@/components/hive/listing';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { demoListings, getListingById } from '@/data/module-one-demo';
import { useTheme } from '@/hooks/use-theme';

const propertyFacts = [
  { label: 'Bedrooms', value: '2' },
  { label: 'Bathrooms', value: '1' },
  { label: 'Lease', value: '12 mo' },
  { label: 'Available', value: 'Aug 1' },
];

const amenities = ['In-unit W/D', 'Dishwasher', 'Pet friendly', 'Natural light', 'Near transit', 'Shared roof'];

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const listing = getListingById(id);
  const gallery = [listing, ...demoListings.filter((item) => item.id !== listing.id)].slice(0, 4);

  return (
    <Screen contentStyle={styles.screen}>
      <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <Image source={{ uri: listing.image }} style={styles.heroImage} contentFit="cover" transition={240} />
        <View style={[styles.heroScrim, { backgroundColor: theme.imageScrim }]} />
        <View style={styles.topActions}>
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
          <IconButton
            icon={hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' })}
            label="Save"
            selected
            tone="accent"
          />
        </View>
        <View style={styles.heroCopy}>
          <ThemedText type="title" style={styles.heroTitle}>
            {listing.title}
          </ThemedText>
          <PriceLabel price={listing.price} inverted />
          <ThemedText type="smallBold" style={styles.whiteText}>
            {listing.location}
          </ThemedText>
          <ListingMetaRow beds={listing.beds} baths={listing.baths} amenities={listing.amenities} inverted />
          <View style={styles.heroBadges}>
            <MatchBadge value={listing.match} />
            <Pill tone="success">Available Aug 1</Pill>
          </View>
        </View>
      </View>

      <View style={styles.gallery}>
        {gallery.map((item) => (
          <Image key={item.id} source={{ uri: item.image }} style={styles.galleryImage} contentFit="cover" />
        ))}
      </View>

      <AppSection title="Property facts">
        <View style={styles.factGrid}>
          {propertyFacts.map((fact) => (
            <View
              key={fact.label}
              style={[styles.factTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="metric">{fact.value}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {fact.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </AppSection>

      <AppSection title="Overview">
        <SurfacePanel>
          <ThemedText type="small" themeColor="textSecondary">
            Bright two-bedroom apartment with an open living room, calm bedrooms, in-unit laundry,
            and enough shared space for roommates who want privacy without feeling boxed in.
          </ThemedText>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Amenities">
        <SurfacePanel>
          <View style={styles.chips}>
            {amenities.map((amenity, index) => (
              <PreferenceChip key={amenity} label={amenity} selected={index < 4} />
            ))}
          </View>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Monthly costs">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'dollarsign.circle.fill', android: 'attach_money', web: 'attach_money' })}
            title="Estimated rent"
            subtitle="Per person, based on your group"
            value={`${listing.price}/mo`}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'bolt.fill', android: 'bolt', web: 'bolt' })}
            title="Utilities"
            subtitle="Estimated electricity, gas, internet"
            value="$135"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' })}
            title="Move-in estimate"
            subtitle="First month and security deposit"
            value="$3,700"
          />
        </SurfacePanel>
      </AppSection>

      <AppSection title="Group fit">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' })}
            title="Budget works"
            subtitle="All roommates are inside the rent range."
            value={`${listing.match}%`}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'tram.fill', android: 'directions_transit', web: 'directions_transit' })}
            title="Commute overlap"
            subtitle="Near transit and bike-friendly routes."
            value="18m"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'pawprint.fill', android: 'pets', web: 'pets' })}
            title="Pet policy"
            subtitle="Cats and small dogs allowed."
            value="Friendly"
          />
        </SurfacePanel>
      </AppSection>

      <View style={styles.actions}>
        <Button variant="ghost" fullWidth onPress={() => router.back()}>
          Pass
        </Button>
        <Button fullWidth>Add to saved</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  hero: {
    height: 420,
    borderWidth: 1,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
  },
  topActions: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    top: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCopy: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    gap: Spacing.one,
  },
  heroTitle: {
    color: '#FFFFFF',
  },
  whiteText: {
    color: '#FFFFFF',
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  gallery: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  galleryImage: {
    flex: 1,
    height: 82,
    borderRadius: Radius.lg,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  factTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 82,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
