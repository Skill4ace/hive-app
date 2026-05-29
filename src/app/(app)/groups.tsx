import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, StatStrip, SurfacePanel } from '@/components/hive/app-shell';
import { GroupConsensusRow, type Listing } from '@/components/hive/listing';
import {
  AvatarStack,
  Button,
  EmptyState,
  FormField,
  IconButton,
  IconGlyph,
  Pill,
  Screen,
  Skeleton,
  hiveSymbol,
} from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSavedRealListings } from '@/hooks/use-real-listings';
import { useTheme } from '@/hooks/use-theme';
import { useHiveGroup, type GroupOutcome } from '@/lib/group-state';

export default function GroupsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    group,
    members,
    loading,
    syncing,
    error,
    matchedOutcomes,
    partialOutcomes,
    createGroup,
    joinGroup,
    leaveGroup,
    refresh,
  } = useHiveGroup();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listingIds = useMemo(
    () => [...matchedOutcomes, ...partialOutcomes].map((outcome) => outcome.propertyId),
    [matchedOutcomes, partialOutcomes],
  );
  const { data: listings, loading: listingsLoading } = useSavedRealListings(listingIds);
  const listingsById = useMemo(
    () => Object.fromEntries(listings.map((listing) => [listing.id, listing])),
    [listings],
  );

  const runGroupAction = async (action: () => Promise<void>) => {
    setSubmitting(true);
    try {
      await action();
      setInviteCode('');
    } catch (nextError) {
      Alert.alert('Group update failed', nextError instanceof Error ? nextError.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLeave = () => {
    Alert.alert('Leave group?', 'Your existing votes stay in your personal history, but this group will stop using them.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          void runGroupAction(leaveGroup);
        },
      },
    ]);
  };

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title="Groups"
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' })}
            label="Refresh group"
            onPress={refresh}
          />
        }
      />

      {loading && !group ? (
        <View style={styles.stack}>
          <Skeleton height={230} radius={Radius.xxl} />
          <Skeleton height={150} radius={Radius.xxl} />
        </View>
      ) : group ? (
        <>
          <SurfacePanel>
            <View style={styles.groupHeroTop}>
              <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
                <IconGlyph
                  name={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
                  color={theme.primary}
                  size={32}
                />
              </View>
              <View style={styles.heroCopy}>
                <ThemedText type="title">{group.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {members.length} {members.length === 1 ? 'member' : 'members'} voting on {group.campusName} housing
                </ThemedText>
              </View>
            </View>

            <View style={[styles.inviteBox, { backgroundColor: theme.backgroundElement }]}>
              <View>
                <ThemedText type="label" themeColor="textTertiary">
                  Group code
                </ThemedText>
                <ThemedText selectable type="subtitle">
                  {group.inviteCode ?? 'Loading'}
                </ThemedText>
              </View>
              <Pill tone={syncing ? 'warning' : 'primary'}>{syncing ? 'Syncing' : 'Live'}</Pill>
            </View>

            <Button
              fullWidth
              rightIcon={hiveSymbol({ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' })}
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}>
              Open group detail
            </Button>
          </SurfacePanel>

          <StatStrip
            items={[
              { label: 'Matched', value: String(matchedOutcomes.length), tone: 'success' },
              { label: 'Still deciding', value: String(partialOutcomes.length), tone: 'warning' },
              { label: 'Members', value: String(members.length), tone: 'primary' },
            ]}
          />

          <AppSection title="Members">
            <SurfacePanel>
              <View style={styles.memberTop}>
                <AvatarStack people={members.map((member) => ({ name: member.name }))} size={38} />
                <ThemedText type="caption" themeColor="textSecondary">
                  Names show in vote status
                </ThemedText>
              </View>
              <View style={styles.memberRows}>
                {members.map((member) => (
                  <View key={member.userId} style={styles.memberRow}>
                    <View style={[styles.memberIcon, { backgroundColor: theme.primarySoft }]}>
                      <ThemedText type="caption" style={{ color: theme.primary }}>
                        {member.name.slice(0, 1).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.memberCopy}>
                      <ThemedText type="smallBold">{member.name}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {member.role === 'owner' ? 'Owner' : 'Member'}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </SurfacePanel>
          </AppSection>

          <OutcomeSection
            title="Group matches"
            emptyTitle="No shared matches yet"
            emptyBody="When everyone likes the same place, it appears here and in Saved."
            loading={listingsLoading}
            outcomes={matchedOutcomes}
            listingsById={listingsById}
          />

          <OutcomeSection
            title="Still deciding"
            emptyTitle="No partial matches yet"
            emptyBody="Places with at least one like will show here while roommates vote."
            loading={listingsLoading}
            outcomes={partialOutcomes}
            listingsById={listingsById}
          />

          {error ? (
            <SurfacePanel>
              <ThemedText type="smallBold" style={{ color: theme.danger }}>
                Group sync issue
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {error}
              </ThemedText>
              <Button variant="secondary" onPress={refresh}>
                Try again
              </Button>
            </SurfacePanel>
          ) : null}

          <Button variant="danger" fullWidth disabled={submitting} onPress={confirmLeave}>
            Leave group
          </Button>
        </>
      ) : (
        <>
          <SurfacePanel>
            <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
              <IconGlyph
                name={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
                color={theme.primary}
                size={34}
              />
            </View>
            <View style={styles.emptyCopy}>
              <ThemedText type="title" style={styles.centerText}>
                Start a private group
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Invite roommates and see which apartments everyone likes.
              </ThemedText>
            </View>
            <Button
              fullWidth
              disabled={submitting}
              leftIcon={hiveSymbol({ ios: 'plus', android: 'add', web: 'add' })}
              onPress={() => {
                void runGroupAction(createGroup);
              }}>
              Create group
            </Button>
          </SurfacePanel>

          <SurfacePanel>
            <FormField
              label="Group code"
              value={inviteCode}
              placeholder="HIVE-A1B2C3"
              onChangeText={(value) => setInviteCode(value.toUpperCase())}
              icon={hiveSymbol({ ios: 'link', android: 'link', web: 'link' })}
              error={error ?? undefined}
            />
            <Button
              fullWidth
              variant="secondary"
              disabled={submitting || inviteCode.trim().length === 0}
              leftIcon={hiveSymbol({ ios: 'link', android: 'link', web: 'link' })}
              onPress={() => {
                void runGroupAction(() => joinGroup(inviteCode));
              }}>
              Join with code
            </Button>
          </SurfacePanel>
        </>
      )}
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
}: {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  loading: boolean;
  outcomes: GroupOutcome[];
  listingsById: Record<string, Listing>;
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
              <GroupConsensusRow
                key={outcome.propertyId}
                listing={listing}
                status={outcome.status === 'matched' ? 'matched' : 'discussing'}
                likes={`${outcome.likes}/${outcome.members.length}`}
                people={outcome.members
                  .filter((member) => member.decision === 'liked')
                  .map((member) => ({ name: member.name }))}
              />
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
    paddingBottom: 110,
  },
  stack: {
    gap: Spacing.two,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: Radius.xl,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  emptyCopy: {
    gap: Spacing.one,
  },
  centerText: {
    textAlign: 'center',
  },
  inviteBox: {
    minHeight: 74,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  memberRows: {
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  memberIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCopy: {
    flex: 1,
  },
});
