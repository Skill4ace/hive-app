import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppTopBar } from '@/components/hive/app-shell';
import { IconButton, IconGlyph, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ListingCard } from '@/components/hive/listing';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { demoListings } from '@/data/module-one-demo';
import { useTheme } from '@/hooks/use-theme';

const UCLA_REGION: Region = {
  latitude: 34.0667,
  longitude: -118.4467,
  latitudeDelta: 0.033,
  longitudeDelta: 0.027,
};

export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ selected?: string }>();
  const initialSelected = useMemo(
    () => demoListings.find((listing) => listing.id === params.selected)?.id ?? demoListings[0].id,
    [params.selected],
  );
  const [selectedId, setSelectedId] = useState(initialSelected);
  const [query, setQuery] = useState('UCLA');
  const selectedListing = demoListings.find((listing) => listing.id === selectedId) ?? demoListings[0];

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <AppTopBar title="Map" />

      <View style={[styles.mapShell, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={UCLA_REGION}
          loadingEnabled
          loadingBackgroundColor={theme.backgroundElement}
          showsBuildings
          showsCompass={false}
          showsPointsOfInterests>
          {demoListings.map((listing) => {
            if (!listing.coordinates) {
              return null;
            }

            const selected = listing.id === selectedId;

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

        <View style={styles.overlayTop}>
          <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <IconGlyph
              name={hiveSymbol({ ios: 'magnifyingglass', android: 'search', web: 'search' })}
              color={theme.textSecondary}
              size={18}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Campus or apartment"
              placeholderTextColor={theme.textTertiary}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <IconButton
            icon={hiveSymbol({ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' })}
            label="Filter map"
          />
        </View>

        <View style={styles.campusPin}>
          <View style={[styles.campusDot, { backgroundColor: theme.primary }]}>
            <IconGlyph
              name={hiveSymbol({ ios: 'graduationcap.fill', android: 'school', web: 'school' })}
              color={theme.primaryText}
              size={16}
            />
          </View>
          <ThemedText type="caption" style={{ color: theme.primary }}>
            UCLA
          </ThemedText>
        </View>

        <View style={styles.preview}>
          <ListingCard
            listing={selectedListing}
            variant="row"
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: selectedListing.id } })}
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
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: 110,
    gap: Spacing.two,
  },
  mapShell: {
    flex: 1,
    minHeight: 520,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.card,
  },
  overlayTop: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchBar: {
    flex: 1,
    minHeight: 48,
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
    minHeight: 42,
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
  campusPin: {
    position: 'absolute',
    top: '36%',
    left: '53%',
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
  preview: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
  },
});
