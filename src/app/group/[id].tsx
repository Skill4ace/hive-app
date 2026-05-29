import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHero, AppSection, SettingRow, StatStrip, SurfacePanel } from '@/components/hive/app-shell';
import { GroupConsensusRow, type Listing } from '@/components/hive/listing';
import { EmptyState, IconButton, Pill, Screen, Skeleton, hiveSymbol } from '@/components/hive/primitives';
import { Radius, Spacing } from '@/constants/theme';
import { useSavedRealListings } from '@/hooks/use-real-listings';
import { useHiveGroup, type GroupOutcome } from '@/lib/group-state';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { group, members, matchedOutcomes, partialOutcomes, loading } = useHiveGroup();
  const listingIds = useMemo(
    () => [...matchedOutcomes, ...partialOutcomes].map((outcome) => outcome.propertyId),
    [matchedOutcomes, partialOutcomes],
  );
  const { data: listings, loading: listingsLoading } = useSavedRealListings(listingIds);
  const listingsById = useMemo(
    () => Object.fromEntries(listings.map((listing) => [listing.id, listing])),
    [listings],
  );

  if (loading && !group) {
    return (
      <Screen contentStyle={styles.screen}>
        <Skeleton height={180} radius={Radius.xxl} />
        <Skeleton height={112} radius={Radius.xl} />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen contentStyle={styles.screen}>
        <EmptyState
          icon={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
          title="No active group"
          body="Create or join a group from the Groups tab."
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Private group"
        title={group.name}
        subtitle={`Invite code ${group.inviteCode ?? 'loading'} · ${group.campusName}`}
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
        }>
        <StatStrip
          items={[
            { label: 'Matched', value: String(matchedOutcomes.length), tone: 'success' },
            { label: 'Still deciding', value: String(partialOutcomes.length), tone: 'warning' },
            { label: 'Members', value: String(members.length), tone: 'primary' },
          ]}
        />
      </AppHero>

      <AppSection title="Roommates">
        <SurfacePanel>
          {members.map((member) => (
            <SettingRow
              key={member.userId}
              icon={hiveSymbol({ ios: 'person.crop.circle.fill', android: 'person', web: 'person' })}
              title={member.name}
              subtitle={member.role === 'owner' ? 'Owner' : 'Member'}
              value="Active"
            />
          ))}
        </SurfacePanel>
      </AppSection>

      <OutcomeSection
        title="Group matches"
        emptyTitle="No shared matches yet"
        emptyBody="These appear when everyone likes the same listing."
        loading={listingsLoading}
        outcomes={matchedOutcomes}
        listingsById={listingsById}
      />

      <OutcomeSection
        title="Still deciding"
        emptyTitle="No partial matches yet"
        emptyBody="Listings with at least one like appear here while roommates vote."
        loading={listingsLoading}
        outcomes={partialOutcomes}
        listingsById={listingsById}
        showVotes
      />
    </Screen>
  );
}

function OutcomeSection({
  title,
  emptyTitle,
  emptyBody,
  loading,
  outcomes,
  listingsById,
  showVotes,
}: {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  loading: boolean;
  outcomes: GroupOutcome[];
  listingsById: Record<string, Listing>;
  showVotes?: boolean;
}) {
  return (
    <AppSection title={title}>
      {loading ? (
        <View style={styles.stack}>
          <Skeleton height={112} radius={Radius.xl} />
          <Skeleton height={112} radius={Radius.xl} />
        </View>
      ) : outcomes.length === 0 ? (
        <EmptyState
          icon={hiveSymbol({ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' })}
          title={emptyTitle}
          body={emptyBody}
        />
      ) : (
        <View style={styles.stack}>
          {outcomes.map((outcome) => {
            const listing = listingsById[outcome.propertyId];
            if (!listing) return null;

            return (
              <View key={outcome.propertyId} style={styles.outcomeBlock}>
                <GroupConsensusRow
                  listing={listing}
                  status={outcome.status === 'matched' ? 'matched' : 'discussing'}
                  likes={`${outcome.likes}/${outcome.members.length}`}
                  people={outcome.members
                    .filter((member) => member.decision === 'liked')
                    .map((member) => ({ name: member.name }))}
                />
                {showVotes ? (
                  <View style={styles.voteStrip}>
                    {outcome.members.map((member) => (
                      <Pill
                        key={member.userId}
                        tone={
                          member.decision === 'liked'
                            ? 'success'
                            : member.decision === 'passed'
                              ? 'danger'
                              : 'neutral'
                        }>
                        {member.name}: {member.decision}
                      </Pill>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </AppSection>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  stack: {
    gap: Spacing.two,
  },
  outcomeBlock: {
    gap: Spacing.one,
  },
  voteStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
