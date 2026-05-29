import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { GroupConsensusRow, type Listing } from '@/components/hive/listing';
import {
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
    authUserId,
    members,
    loading,
    syncing,
    error,
    outcomes,
    matchedOutcomes,
    partialOutcomes,
    createGroup,
    joinGroup,
    leaveGroup,
    removeMember,
    refresh,
  } = useHiveGroup();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const compactError = error ? readGroupErrorCopy(error) : null;
  const listingIds = useMemo(() => outcomes.map((outcome) => outcome.propertyId), [outcomes]);
  const { data: listings, loading: listingsLoading } = useSavedRealListings(listingIds);
  const listingsById = useMemo(
    () => Object.fromEntries(listings.map((listing) => [listing.id, listing])),
    [listings],
  );
  const isOwner = Boolean(group && authUserId === group.ownerId);

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

  const confirmRemoveMember = (member: (typeof members)[number]) => {
    Alert.alert('Remove member?', `${member.name} will lose access to this group.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void runGroupAction(() => removeMember(member.userId));
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
              <View style={[styles.groupIcon, { backgroundColor: theme.primarySoft }]}>
                <IconGlyph
                  name={hiveSymbol({ ios: 'person.2.fill', android: 'groups', web: 'groups' })}
                  color={theme.primary}
                  size={20}
                />
              </View>
              <View style={styles.heroCopy}>
                <ThemedText type="sectionTitle" numberOfLines={1}>
                  {group.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {members.length} {members.length === 1 ? 'member' : 'members'} · {group.campusName}
                </ThemedText>
              </View>
              <Pill tone={syncing ? 'warning' : 'primary'}>{syncing ? 'Syncing' : 'Live'}</Pill>
            </View>

            <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="label" themeColor="textTertiary">
                Code
              </ThemedText>
              <ThemedText selectable type="subtitle" style={styles.codeText}>
                {group.inviteCode ?? 'Loading'}
              </ThemedText>
            </View>

            <View style={[styles.memberDivider, { backgroundColor: theme.border }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={membersExpanded ? 'Hide members' : 'Show members'}
              onPress={() => setMembersExpanded((current) => !current)}
              style={({ pressed }) => [styles.inlineMembersHeader, { opacity: pressed ? 0.72 : 1 }]}>
              <ThemedText type="label" themeColor="textTertiary">
                Members
              </ThemedText>
              <View style={styles.memberHeaderRight}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {members.length}
                </ThemedText>
                <IconGlyph
                  name={hiveSymbol({
                    ios: membersExpanded ? 'chevron.up' : 'chevron.down',
                    android: membersExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
                    web: membersExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down',
                  })}
                  color={theme.textTertiary}
                  size={16}
                />
              </View>
            </Pressable>

            {membersExpanded ? (
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
                    {isOwner && member.userId !== authUserId && member.role !== 'owner' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${member.name}`}
                        disabled={submitting}
                        onPress={() => confirmRemoveMember(member)}
                        style={({ pressed }) => [
                          styles.memberRemove,
                          {
                            backgroundColor: theme.dangerSoft,
                            opacity: submitting ? 0.46 : pressed ? 0.72 : 1,
                          },
                        ]}>
                        <ThemedText type="caption" style={{ color: theme.danger }}>
                          Remove
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </SurfacePanel>

          <OutcomeList
            loading={listingsLoading}
            matchedOutcomes={matchedOutcomes}
            partialOutcomes={partialOutcomes}
            listingsById={listingsById}
            onOpenListing={(id) => router.push({ pathname: '/listing/[id]', params: { id } })}
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
                Private group
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Create a code for your roommates.
              </ThemedText>
            </View>
            <Button
              fullWidth
              disabled={submitting}
              leftIcon={hiveSymbol({ ios: 'plus', android: 'add', web: 'add' })}
              onPress={() => {
                void runGroupAction(createGroup);
              }}>
              Create
            </Button>
          </SurfacePanel>

          <SurfacePanel>
            <ThemedText type="subtitle">Join a group</ThemedText>
            <FormField
              label="Code"
              value={inviteCode}
              placeholder="ABCD"
              onChangeText={(value) => setInviteCode(normalizeInviteInput(value))}
              icon={hiveSymbol({ ios: 'link', android: 'link', web: 'link' })}
            />
            {compactError ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
                <ThemedText type="caption" style={{ color: theme.danger }}>
                  {compactError}
                </ThemedText>
              </View>
            ) : null}
            <Button
              fullWidth
              variant="secondary"
              disabled={submitting || inviteCode.trim().length !== 4}
              leftIcon={hiveSymbol({ ios: 'link', android: 'link', web: 'link' })}
              onPress={() => {
                void runGroupAction(() => joinGroup(inviteCode));
              }}>
              Join
            </Button>
          </SurfacePanel>
        </>
      )}
    </Screen>
  );
}

function readGroupErrorCopy(error: string) {
  if (error.toLowerCase().includes('anonymous sign-ins are disabled')) {
    return 'Login setting changed. Tap refresh.';
  }

  return 'Could not connect. Try refresh.';
}

function normalizeInviteInput(value: string) {
  return value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4);
}

function OutcomeList({
  loading,
  matchedOutcomes,
  partialOutcomes,
  listingsById,
  onOpenListing,
}: {
  loading: boolean;
  matchedOutcomes: GroupOutcome[];
  partialOutcomes: GroupOutcome[];
  listingsById: Record<string, Listing>;
  onOpenListing: (id: string) => void;
}) {
  const hasMatches = matchedOutcomes.length > 0;
  const hasPartial = partialOutcomes.length > 0;

  return (
    <AppSection title="Shared list">
      {loading ? (
        <View style={styles.stack}>
          <Skeleton height={112} radius={Radius.xl} />
          <Skeleton height={112} radius={Radius.xl} />
        </View>
      ) : !hasMatches && !hasPartial ? (
        <EmptyState
          icon={hiveSymbol({ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' })}
          title="No shared places yet"
          body="Like places in Discover to start."
        />
      ) : (
        <View style={styles.stack}>
          {hasMatches ? <OutcomeRows title="Matches" outcomes={matchedOutcomes} listingsById={listingsById} onOpenListing={onOpenListing} /> : null}
          {hasPartial ? <OutcomeRows title="Still deciding" outcomes={partialOutcomes} listingsById={listingsById} onOpenListing={onOpenListing} /> : null}
        </View>
      )}
    </AppSection>
  );
}

function OutcomeRows({
  title,
  outcomes,
  listingsById,
  onOpenListing,
}: {
  title: string;
  outcomes: GroupOutcome[];
  listingsById: Record<string, Listing>;
  onOpenListing: (id: string) => void;
}) {
  return (
    <View style={styles.outcomeGroup}>
      <ThemedText type="label" themeColor="textTertiary">
        {title}
      </ThemedText>
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
              onPress={() => onOpenListing(outcome.propertyId)}
            />
          );
        })}
      </View>
    </View>
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
    gap: Spacing.two,
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  codeBox: {
    minHeight: 54,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  codeText: {
    letterSpacing: 0,
  },
  memberDivider: {
    height: 1,
  },
  inlineMembersHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  memberHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  memberRows: {
    gap: Spacing.one,
  },
  memberRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  memberIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCopy: {
    flex: 1,
  },
  memberRemove: {
    minHeight: 28,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeGroup: {
    gap: Spacing.two,
  },
  errorBox: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
