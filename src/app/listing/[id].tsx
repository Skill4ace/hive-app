import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { BottomSheet, Button, EmptyState, FormField, IconButton, IconGlyph, Pill, Screen, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { ListingMetaRow, PriceLabel, SwipeActionButton } from '@/components/hive/listing';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { submitListingLeadRequest } from '@/data/lead-requests';
import { formatMoney, formatMoveIn } from '@/data/real-listings';
import { useRealListingDetail } from '@/hooks/use-real-listings';
import { useTheme } from '@/hooks/use-theme';
import { useHiveGroup } from '@/lib/group-state';
import { useHiveAppState } from '@/lib/hive-state';

const defaultLeadMessage =
  "Hi, I'm interested in this listing. Can you share current availability, tour options, and next steps?";

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listingId = Array.isArray(id) ? id[0] : id;
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { decisions, preferences, recordDecision, clearDecision } = useHiveAppState();
  const { group, members, outcomesByListing, deleteSyncedDecision } = useHiveGroup();
  const { data: detail, loading, error, refresh } = useRealListingDetail(listingId);
  const galleryRef = useRef<ScrollView>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});
  const [requestVisible, setRequestVisible] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestName, setRequestName] = useState(preferences.username);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestMessage, setRequestMessage] = useState(defaultLeadMessage);
  const [partnerConsent, setPartnerConsent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
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

  const selectPhoto = (index: number) => {
    setPhotoIndex(index);
    galleryRef.current?.scrollTo({ x: contentWidth * index, animated: true });
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
      void deleteSyncedDecision(listing.id);
      return;
    }

    recordDecision(listing.id, 'liked', listing.match);
  };

  const passListing = () => {
    recordDecision(listing.id, 'passed', listing.match);
    router.back();
  };

  const submitRequest = async () => {
    const normalizedEmail = requestEmail.trim();
    const normalizedMessage = requestMessage.trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setRequestError('Enter an email so the housing partner can follow up.');
      return;
    }

    if (!normalizedMessage) {
      setRequestMessage(defaultLeadMessage);
    }

    if (!partnerConsent) {
      setRequestError('Confirm that Hive can share this request with the housing partner.');
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);

    try {
      await submitListingLeadRequest({
        listing,
        detail,
        preferences,
        group,
        contactName: requestName,
        contactEmail: normalizedEmail,
        message: normalizedMessage || defaultLeadMessage,
      });

      setRequestSubmitted(true);
      setRequestVisible(false);
    } catch (nextError) {
      setRequestError(readErrorMessage(nextError));
    } finally {
      setRequestSubmitting(false);
    }
  };

  const openRequestSheet = () => {
    if (!requestMessage.trim()) {
      setRequestMessage(defaultLeadMessage);
    }

    setRequestVisible(true);
  };

  return (
    <Screen
      contentStyle={styles.screen}
      footer={
        <View style={styles.stickyBar}>
          <SwipeActionButton action="pass" size="md" onPress={passListing} />
          <SwipeActionButton action="like" size="md" onPress={saveListing} />
          <View style={styles.stickyRequest}>
            <Button
              fullWidth
              variant={requestSubmitted ? 'secondary' : 'primary'}
              leftIcon={hiveSymbol({
                ios: requestSubmitted ? 'checkmark.circle.fill' : 'paperplane.fill',
                android: requestSubmitted ? 'check_circle' : 'send',
                web: requestSubmitted ? 'check_circle' : 'send',
              })}
              onPress={openRequestSheet}>
              {requestSubmitted ? 'Request sent' : 'Request info'}
            </Button>
          </View>
        </View>
      }>
      <View style={[styles.galleryShell, { width: contentWidth, backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
        <ScrollView
          ref={galleryRef}
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
      </View>

      {gallery.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRail}>
          {gallery.slice(0, 12).map((photo, index) => {
            const selected = index === photoIndex;

            return (
              <Pressable
                key={`${photo}-thumb-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Show photo ${index + 1}`}
                onPress={() => selectPhoto(index)}
                style={({ pressed }) => [
                  styles.thumbnailButton,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.78 : selected ? 1 : 0.74,
                  },
                ]}>
                <Image source={{ uri: photo }} style={styles.thumbnailImage} contentFit="cover" transition={160} />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

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
            <Pill tone="primary">{listing.match}% fit</Pill>
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

      {group ? (
        <AppSection title="Group pulse">
          <SurfacePanel>
            <SettingRow
              icon={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
              title={group.name}
              subtitle={readGroupOutcomeLabel(outcomesByListing[listing.id], members.length)}
              value={outcomesByListing[listing.id]?.status === 'matched' ? 'Matched' : 'Voting'}
            />
            {readMemberVotes(outcomesByListing[listing.id], members).map((member) => (
              <SettingRow
                key={member.userId}
                icon={hiveSymbol({
                  ios:
                    member.decision === 'liked'
                      ? 'heart.fill'
                      : member.decision === 'passed'
                        ? 'xmark'
                        : 'ellipsis',
                  android:
                    member.decision === 'liked'
                      ? 'favorite'
                      : member.decision === 'passed'
                        ? 'close'
                        : 'more_horiz',
                  web:
                    member.decision === 'liked'
                      ? 'favorite'
                      : member.decision === 'passed'
                        ? 'close'
                        : 'more_horiz',
                })}
                title={member.name}
                subtitle={member.decision === 'waiting' ? 'Still deciding' : member.decision}
              />
            ))}
          </SurfacePanel>
        </AppSection>
      ) : null}

      <AppSection title="Overview">
        <SurfacePanel>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={overviewExpanded ? undefined : 5}>
            {detail.property.description ??
              'A campus-ready listing with real availability, source photos, and commute context from the current UCLA dataset.'}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOverviewExpanded((current) => !current)}
            style={({ pressed }) => [styles.inlineToggle, { opacity: pressed ? 0.72 : 1 }]}>
            <ThemedText type="caption" style={{ color: theme.primary }}>
              {overviewExpanded ? 'Show less' : 'Read more'}
            </ThemedText>
          </Pressable>
        </SurfacePanel>
      </AppSection>

      <AppSection title="Campus map">
        <View style={[styles.mapPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {mapRegion && listing.coordinates ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={mapRegion}
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              pitchEnabled
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
        </View>
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

      <AppSection title="Notes">
        <SurfacePanel>
          <View style={styles.notesList}>
            {amenities.map((amenity, index) => (
              <View key={`${amenity}-${index}`} style={[styles.noteRow, { borderColor: theme.border }]}>
                <View style={[styles.noteDot, { backgroundColor: theme.primary }]} />
                <ThemedText type="caption" themeColor="textSecondary" style={styles.noteText}>
                  {amenity}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfacePanel>
      </AppSection>

      {detail.faqs.length > 0 ? (
        <AppSection title="FAQs">
          <SurfacePanel>
            {detail.faqs.slice(0, 4).map((faq) => (
              <Pressable
                key={faq.question}
                accessibilityRole="button"
                accessibilityState={{ expanded: Boolean(expandedFaqs[faq.question]) }}
                onPress={() =>
                  setExpandedFaqs((current) => ({
                    ...current,
                    [faq.question]: !current[faq.question],
                  }))
                }
                style={({ pressed }) => [styles.faq, { opacity: pressed ? 0.78 : 1 }]}>
                <View style={styles.faqQuestion}>
                  <ThemedText type="smallBold" style={styles.faqQuestionText}>
                    {faq.question}
                  </ThemedText>
                  <IconGlyph
                    name={hiveSymbol({
                      ios: expandedFaqs[faq.question] ? 'chevron.up' : 'chevron.down',
                      android: expandedFaqs[faq.question] ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
                      web: expandedFaqs[faq.question] ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
                    })}
                    color={theme.textSecondary}
                    size={18}
                  />
                </View>
                {expandedFaqs[faq.question] ? (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {faq.answer}
                  </ThemedText>
                ) : null}
              </Pressable>
            ))}
          </SurfacePanel>
        </AppSection>
      ) : null}

      <BottomSheet
        visible={requestVisible}
        title={group ? 'Request as a group' : 'Request info'}
        onClose={() => setRequestVisible(false)}
        footer={
          <Button
            fullWidth
            disabled={requestSubmitting}
            leftIcon={hiveSymbol({ ios: 'paperplane.fill', android: 'send', web: 'send' })}
            onPress={submitRequest}>
            {requestSubmitting ? 'Sending...' : requestSubmitted ? 'Send update' : 'Send request'}
          </Button>
        }>
        <View style={styles.requestSheetIntro}>
          <ThemedText type="smallBold">{listing.title}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {listing.address ? `${listing.address} · ${listing.location}` : listing.location}
          </ThemedText>
        </View>
        <FormField
          label="Name"
          value={requestName}
          onChangeText={setRequestName}
          placeholder="Your name"
          icon={hiveSymbol({ ios: 'person.fill', android: 'person', web: 'person' })}
        />
        <FormField
          label="Email"
          value={requestEmail}
          onChangeText={(value) => {
            setRequestEmail(value);
            setRequestError(null);
          }}
          placeholder="name@email.com"
          icon={hiveSymbol({ ios: 'envelope.fill', android: 'mail', web: 'mail' })}
        />
        <FormField
          label="Message"
          value={requestMessage}
          onChangeText={setRequestMessage}
          placeholder="Ask about availability, tours, or next steps."
          multiline
          icon={hiveSymbol({ ios: 'text.bubble.fill', android: 'chat_bubble', web: 'chat_bubble' })}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: partnerConsent }}
          onPress={() => {
            setPartnerConsent((current) => !current);
            setRequestError(null);
          }}
          style={({ pressed }) => [
            styles.consentRow,
            {
              borderColor: partnerConsent ? theme.primary : theme.border,
              backgroundColor: partnerConsent ? theme.primarySoft : theme.surface,
              opacity: pressed ? 0.78 : 1,
            },
          ]}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: partnerConsent ? theme.primary : theme.borderStrong,
                backgroundColor: partnerConsent ? theme.primary : 'transparent',
              },
            ]}>
            {partnerConsent ? (
              <ThemedText type="caption" style={{ color: theme.primaryText }}>
                ✓
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.consentCopy}>
            Share my name, email, preferences, and request details with the housing partner so they can respond.
          </ThemedText>
        </Pressable>
        {requestError ? (
          <ThemedText type="caption" style={{ color: theme.danger }}>
            {requestError}
          </ThemedText>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong while sending this request.';
}

function readGroupOutcomeLabel(
  outcome: ReturnType<typeof useHiveGroup>['outcomesByListing'][string] | undefined,
  memberCount: number,
) {
  if (!outcome) return 'No group votes on this listing yet.';
  if (outcome.status === 'matched') return `Everyone liked this place (${outcome.likes}/${memberCount}).`;
  return `${outcome.likes}/${memberCount} liked · ${outcome.passes} passed · ${outcome.waiting} waiting.`;
}

function readMemberVotes(
  outcome: ReturnType<typeof useHiveGroup>['outcomesByListing'][string] | undefined,
  members: ReturnType<typeof useHiveGroup>['members'],
) {
  if (outcome) return outcome.members;

  return members.map((member) => ({
    userId: member.userId,
    name: member.name,
    decision: 'waiting' as const,
  }));
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
  thumbnailRail: {
    paddingHorizontal: Spacing.one,
    gap: Spacing.two,
  },
  thumbnailButton: {
    width: 68,
    height: 54,
    borderRadius: Radius.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  inlineToggle: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  faqQuestionText: {
    flex: 1,
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
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  stickyRequest: {
    flex: 1,
  },
  notesList: {
    gap: Spacing.two,
  },
  noteRow: {
    minHeight: 38,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  noteText: {
    flex: 1,
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
  faq: {
    gap: Spacing.one,
  },
  requestSheetIntro: {
    gap: Spacing.half,
  },
  consentRow: {
    minHeight: 72,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentCopy: {
    flex: 1,
  },
});
