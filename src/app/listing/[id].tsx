import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, Pill, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ListingMetaRow, MatchBadge, PriceLabel } from '@/components/hive/listing';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { demoListings, getListingById } from '@/data/module-one-demo';
import { useTheme } from '@/hooks/use-theme';

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);
  const listing = getListingById(id);
  const gallery =
    listing.photos && listing.photos.length > 0
      ? listing.photos
      : [listing.image, ...demoListings.filter((item) => item.id !== listing.id).map((item) => item.image)].slice(0, 4);
  const contentWidth = Math.min(width - Spacing.three * 2, 620);
  const propertyFacts = [
    { label: 'Beds', value: `${listing.beds}` },
    { label: 'Baths', value: `${listing.baths}` },
    { label: 'Lease', value: listing.leaseTerm ?? '12 mo' },
    { label: 'Move-in', value: listing.available ?? 'Aug 1' },
  ];
  const amenities = [
    ...listing.amenities,
    'Pet friendly',
    'Natural light',
    listing.campusCommute ?? 'Near campus',
    'Study-friendly',
  ];
  const mapRegion: Region = {
    latitude: listing.coordinates?.latitude ?? 34.0667,
    longitude: listing.coordinates?.longitude ?? -118.4467,
    latitudeDelta: 0.013,
    longitudeDelta: 0.011,
  };

  const handlePhotoChange = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / contentWidth));
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
        <ListingMetaRow beds={listing.beds} baths={listing.baths} amenities={listing.amenities} />
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
            {listing.overview ?? 'A campus-ready apartment with strong shared space, practical amenities, and a commute that works for class schedules.'}
          </ThemedText>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Campus map">
        <View style={[styles.mapPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
            {listing.coordinates ? (
              <Marker coordinate={listing.coordinates} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={[styles.mapListingPin, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}>
                  <ThemedText type="caption" style={{ color: theme.primaryText }}>
                    {listing.priceShort ?? listing.price}
                  </ThemedText>
                </View>
              </Marker>
            ) : null}
          </MapView>
          <View style={[styles.mapCopy, { backgroundColor: theme.surfaceGlass, borderColor: theme.border }]}>
            <ThemedText type="sectionTitle">{listing.campusDistance ?? 'Near campus'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {listing.campusCommute ?? 'Quick commute'} to {listing.campus ?? 'campus'}
            </ThemedText>
          </View>
        </View>
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
            title="Rent"
            subtitle="Estimated per person"
            value={`${listing.price}/mo`}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'bolt.fill', android: 'bolt', web: 'bolt' })}
            title="Utilities"
            subtitle="Electricity, gas, internet"
            value={listing.utilities ?? '$120'}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' })}
            title="Move-in estimate"
            subtitle="First month and security deposit"
            value={listing.deposit ? `${listing.price} + ${listing.deposit}` : '$3,700'}
          />
        </SurfacePanel>
      </AppSection>

      <AppSection title="Campus and group fit">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
            title={`Distance to ${listing.campus ?? 'campus'}`}
            subtitle={listing.campusCommute ?? 'Quick commute for morning classes.'}
            value={listing.campusDistance?.replace(' to campus', '')}
          />
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
    minHeight: 180,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapListingPin: {
    minWidth: 70,
    height: 34,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
