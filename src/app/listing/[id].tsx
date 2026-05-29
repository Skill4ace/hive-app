import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { Button, EmptyState, IconButton, Pill, PreferenceChip, Screen, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { ListingMetaRow, MatchBadge, PriceLabel } from '@/components/hive/listing';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { formatMoney, formatMoveIn } from '@/data/real-listings';
import { useRealListingDetail } from '@/hooks/use-real-listings';
import { useTheme } from '@/hooks/use-theme';
import { useHiveAppState } from '@/lib/hive-state';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listingId = Array.isArray(id) ? id[0] : id;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { decisions, recordDecision, clearDecision } = useHiveAppState();
  const { data: detail, loading, error, refresh } = useRealListingDetail(listingId);
  const [photoIndex, setPhotoIndex] = useState(0);
  const listing = detail?.listing;
  const gallery = listing ? (detail.photos.length > 0 ? detail.photos : [listing.image]).filter(Boolean) : [];
  const contentWidth = Math.min(width - Spacing.three * 2, 620);
  const isSaved = listing ? decisions[listing.id]?.decision === 'liked' : false;
  const availableUnits = detail?.units.filter((unit) =>
    ['available_now', 'available_on'].includes(unit.availability_status),
  ) ?? [];
  const primaryUnit = availableUnits[0] ?? detail?.units[0];

  const handlePhotoChange = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / contentWidth));
  };

  if (loading) {
    return (
      <Screen contentStyle={styles.screen}>
        <Skeleton height={338} radius={Radius.xxl} />
        <Skeleton height={122} radius={Radius.xxl} />
        <Skeleton height={180} radius={Radius.xl} />
      </Screen>
    );
  }

  if (error || !detail || !listing) {
    return (
      <Screen contentStyle={styles.screen}>
        <EmptyState
          icon={hiveSymbol({ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' })}
          title="Listing did not load"
          body={error ?? 'This listing is not available right now.'}
          action={<Button onPress={refresh}>Try again</Button>}
        />
      </Screen>
    );
  }

  const propertyFacts = [
    { label: 'Beds', value: listing.bedsLabel ?? `${listing.beds}` },
    { label: 'Baths', value: listing.bathsLabel ?? `${listing.baths}` },
    { label: 'Units', value: `${listing.availableUnitCount ?? availableUnits.length}` },
    { label: 'Move-in', value: listing.available ?? 'Flexible' },
  ];
  const amenities = [
    ...listing.amenities,
    detail.property.property_type ?? 'Apartment',
    listing.managerDisplayName ? `Managed by ${listing.managerDisplayName}` : null,
  ].filter(Boolean) as string[];
  const mapRegion: Region | null = listing.coordinates
    ? {
        latitude: listing.coordinates.latitude,
        longitude: listing.coordinates.longitude,
        latitudeDelta: 0.013,
        longitudeDelta: 0.011,
      }
    : null;

  const saveListing = () => {
    if (isSaved) {
      clearDecision(listing.id);
      return;
    }

    recordDecision(listing.id, 'liked', listing.match);
  };

  const passListing = () => {
    recordDecision(listing.id, 'passed', listing.match);
    router.back();
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={[styles.galleryShell, { width: contentWidth, backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={handlePhotoChange}
          style={styles.galleryScroll}>
          {gallery.map((photo, index) => (
            <Image
              key={`${listing.id}-photo-${index}`}
              source={{ uri: photo }}
              style={[styles.galleryImage, { width: contentWidth }]}
              contentFit="cover"
              transition={240}
            />
          ))}
        </ScrollView>
        <View style={styles.galleryTop}>
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
          <Pill tone="neutral">
            {photoIndex + 1}/{gallery.length}
          </Pill>
        </View>
        <View style={styles.galleryDots}>
          {gallery.map((photo, index) => (
            <View
              key={`${photo}-${index}`}
              style={[
                styles.dot,
                {
                  width: index === photoIndex ? 18 : 6,
                  backgroundColor: index === photoIndex ? '#FFFFFF' : 'rgba(255,255,255,0.52)',
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryCopy}>
            <ThemedText type="title">{listing.title}</ThemedText>
            <PriceLabel price={listing.price} />
            <ThemedText type="small" themeColor="textSecondary">
              {listing.address ? `${listing.address} · ${listing.location}` : listing.location}
            </ThemedText>
          </View>
          <View style={styles.summaryBadges}>
            <Pill tone="primary">{listing.campusDistance ?? 'Near campus'}</Pill>
            <MatchBadge value={listing.match} compact />
          </View>
        </View>
        <ListingMetaRow
          beds={listing.beds}
          baths={listing.baths}
          bedsLabel={listing.bedsLabel}
          bathsLabel={listing.bathsLabel}
          amenities={listing.amenities}
        />
      </View>

      <AppSection title="Property facts">
        <View style={styles.factGrid}>
          {propertyFacts.map((fact) => (
            <View
              key={fact.label}
              style={[styles.factTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ThemedText type="metric" numberOfLines={1} adjustsFontSizeToFit>
                {fact.value}
              </ThemedText>
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
            {detail.property.description ??
              'A campus-ready listing with real availability, source photos, and commute context from the current UCLA dataset.'}
          </ThemedText>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Available units">
        <SurfacePanel>
          {(availableUnits.length > 0 ? availableUnits : detail.units).slice(0, 5).map((unit) => (
            <SettingRow
              key={unit.id}
              icon={hiveSymbol({ ios: 'door.left.hand.open', android: 'meeting_room', web: 'meeting_room' })}
              title={unit.title || unit.listing_type || 'Available unit'}
              subtitle={[
                unit.listing_type,
                unit.bedrooms ? `${unit.bedrooms} bed` : null,
                unit.bathrooms ? `${unit.bathrooms} bath` : null,
                formatMoveIn(unit.move_in),
              ].filter(Boolean).join(' · ')}
              value={formatMoney(unit.rent_monthly)}
            />
          ))}
        </SurfacePanel>
      </AppSection>

      <AppSection title="Campus map">
        <View style={[styles.mapPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {mapRegion && listing.coordinates ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              loadingEnabled
              loadingBackgroundColor={theme.backgroundElement}
              showsBuildings
              showsCompass={false}>
              <Marker coordinate={listing.coordinates} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={[styles.mapListingPin, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}>
                  <ThemedText type="caption" style={{ color: theme.primaryText }}>
                    {listing.priceShort ?? listing.price}
                  </ThemedText>
                </View>
              </Marker>
            </MapView>
          ) : null}
          <View style={[styles.mapCopy, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
            <ThemedText type="sectionTitle">{listing.campusDistance ?? 'Near campus'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {listing.campusCommute ?? 'Quick commute'} to {listing.campus ?? 'campus'}
            </ThemedText>
          </View>
        </View>
      </AppSection>

      <AppSection title="Amenities and notes">
        <SurfacePanel>
          <View style={styles.chips}>
            {amenities.map((amenity, index) => (
              <PreferenceChip key={`${amenity}-${index}`} label={amenity} selected={index < 4} />
            ))}
          </View>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Monthly costs">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'dollarsign.circle.fill', android: 'attach_money', web: 'attach_money' })}
            title="Rent"
            subtitle="Current available range"
            value={listing.price === 'Contact' ? 'Contact' : `${listing.price}/mo`}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' })}
            title="Security deposit"
            subtitle="Shown when supplied by the source"
            value={formatMoney(primaryUnit?.security_deposit)}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'calendar.badge.clock', android: 'event_available', web: 'event_available' })}
            title="Lease term"
            subtitle="Shortest available term"
            value={primaryUnit?.lease_term_months ? `${primaryUnit.lease_term_months} mo` : 'Ask'}
          />
        </SurfacePanel>
      </AppSection>

      <AppSection title="Search fit">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
            title={`Distance to ${listing.campus ?? 'campus'}`}
            subtitle={listing.campusCommute ?? 'Quick commute for morning classes.'}
            value={listing.campusDistance?.replace(' to campus', '')}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' })}
            title="Preference match"
            subtitle="Budget, commute, timing, and size."
            value={`${listing.match}%`}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'link', android: 'link', web: 'link' })}
            title="Source"
            subtitle={detail.property.source_url}
            value="UniShack"
          />
        </SurfacePanel>
      </AppSection>

      {detail.faqs.length > 0 ? (
        <AppSection title="FAQs">
          <SurfacePanel>
            {detail.faqs.slice(0, 4).map((faq) => (
              <View key={faq.question} style={styles.faq}>
                <ThemedText type="smallBold">{faq.question}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {faq.answer}
                </ThemedText>
              </View>
            ))}
          </SurfacePanel>
        </AppSection>
      ) : null}

      <View style={styles.actions}>
        <Button variant="ghost" fullWidth onPress={passListing}>
          Pass
        </Button>
        <Button fullWidth onPress={saveListing}>
          {isSaved ? 'Saved' : 'Add to saved'}
        </Button>
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
  galleryShell: {
    height: 338,
    alignSelf: 'center',
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  galleryScroll: {
    flex: 1,
  },
  galleryImage: {
    height: 338,
  },
  galleryTop: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    top: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: Radius.pill,
  },
  summary: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
  },
  summaryBadges: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  factTile: {
    flex: 1,
    minWidth: 128,
    minHeight: 78,
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
  mapPanel: {
    height: 238,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapListingPin: {
    minWidth: 68,
    minHeight: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    ...Shadows.soft,
  },
  mapCopy: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
  },
  faq: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
