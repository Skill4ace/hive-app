import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppTopBar } from '@/components/hive/app-shell';
import { IconButton, IconGlyph, Pill, Screen, Skeleton, hiveSymbol, EmptyState, Button } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { searchListings } from '@/data/real-listings';
import { useRealListings } from '@/hooks/use-real-listings';
import { useTheme } from '@/hooks/use-theme';

const UCLA_REGION: Region = {
  latitude: 34.0667,
  longitude: -118.4467,
  latitudeDelta: 0.033,
  longitudeDelta: 0.027,
};

const UCLA_COORDINATE = {
  latitude: 34.0689,
  longitude: -118.4452,
};

export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data: listings, loading, error, refresh } = useRealListings();
  const params = useLocalSearchParams<{ selected?: string }>();
  const searchInputRef = useRef<TextInput>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.selected ?? null);
  const [query, setQuery] = useState('');
  const filteredListings = useMemo(() => searchListings(listings, query), [listings, query]);
  const selectedListing =
    filteredListings.find((listing) => listing.id === selectedId) ??
    filteredListings.find((listing) => listing.id === params.selected) ??
    filteredListings[0] ??
    listings[0] ??
    null;

  useFocusEffect(
    useCallback(() => {
      searchInputRef.current?.blur();
    }, []),
  );

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar
        title="Map"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' })}
            label="Edit preferences"
            onPress={() => router.push('/preferences')}
          />
        }
      />

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <IconGlyph
            name={hiveSymbol({ ios: 'magnifyingglass', android: 'search', web: 'search' })}
            color={theme.textSecondary}
            size={18}
          />
          <TextInput
            ref={searchInputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search apartment"
            placeholderTextColor={theme.textTertiary}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      </View>

      {loading ? (
        <View style={[styles.mapShell, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Skeleton width="100%" height={470} radius={Radius.xxl} />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={hiveSymbol({ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' })}
            title="Map did not load"
            body={error}
            action={<Button onPress={refresh}>Try again</Button>}
          />
        </View>
      ) : (
        <>
          <View style={[styles.mapShell, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={UCLA_REGION}
              loadingEnabled
              loadingBackgroundColor={theme.backgroundElement}
              showsBuildings
              showsCompass={false}
              showsPointsOfInterests
              legalLabelInsets={{ bottom: 10, left: 10, right: 10, top: 10 }}>
              <Marker coordinate={UCLA_COORDINATE} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.campusMarker}>
                  <View style={[styles.campusDot, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}>
                    <IconGlyph
                      name={hiveSymbol({ ios: 'graduationcap.fill', android: 'school', web: 'school' })}
                      color={theme.primaryText}
                      size={16}
                    />
                  </View>
                </View>
              </Marker>

              {filteredListings.map((listing) => {
                if (!listing.coordinates) return null;

                const selected = listing.id === selectedListing?.id;

                return (
                  <Marker
                    key={listing.id}
                    coordinate={listing.coordinates}
                    anchor={{ x: 0.5, y: 0.5 }}
                    onPress={() => setSelectedId(listing.id)}>
                    <View
                      style={[
                        styles.priceMarker,
                        {
                          backgroundColor: selected ? theme.primary : theme.surface,
                          borderColor: selected ? theme.primary : theme.border,
                          shadowColor: theme.shadow,
                        },
                      ]}>
                      <ThemedText
                        type="caption"
                        style={{ color: selected ? theme.primaryText : theme.text }}>
                        {listing.priceShort ?? listing.price}
                      </ThemedText>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          </View>

          {selectedListing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${selectedListing.title}`}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: selectedListing.id } })}
              style={({ pressed }) => [
                styles.previewCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}>
              <Image
                source={{ uri: selectedListing.image }}
                style={styles.previewImage}
                contentFit="cover"
                transition={220}
              />
              <View style={styles.previewCopy}>
                <View style={styles.previewTop}>
                  <ThemedText type="sectionTitle" numberOfLines={1} style={styles.previewTitle}>
                    {selectedListing.title}
                  </ThemedText>
                  <Pill tone="primary">{selectedListing.match}%</Pill>
                </View>
                <View style={styles.previewPriceLine}>
                  <ThemedText type="subtitle">{selectedListing.price}</ThemedText>
                  {selectedListing.price !== 'Contact' ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      / mo
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {selectedListing.location}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {selectedListing.campusDistance}
                </ThemedText>
              </View>
            </Pressable>
          ) : (
            <EmptyState
              icon={hiveSymbol({ ios: 'magnifyingglass', android: 'search', web: 'search' })}
              title="No map results"
              body="Try another building name, address, or manager."
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: 74,
    gap: Spacing.one,
  },
  mapShell: {
    flex: 1,
    minHeight: 470,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: 0,
  },
  searchBar: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    ...Shadows.soft,
  },
  searchInput: {
    flex: 1,
    minHeight: 38,
    padding: 0,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  priceMarker: {
    minWidth: 64,
    minHeight: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    ...Shadows.soft,
  },
  campusMarker: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  campusDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  previewCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.two,
    ...Shadows.soft,
  },
  previewImage: {
    width: 94,
    height: 94,
    borderRadius: Radius.lg,
  },
  previewCopy: {
    flex: 1,
    minHeight: 94,
    justifyContent: 'center',
    gap: 1,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewTitle: {
    flex: 1,
  },
  previewPriceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
