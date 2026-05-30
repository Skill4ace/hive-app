import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getSupabaseClient, getSupabaseConfigError } from '@/lib/supabase';
import {
  useHiveAppState,
  type ListingDecision,
  type ListingDecisionRecord,
  type SearchPreferences,
} from '@/lib/hive-state';

type RpcGroupPayload = {
  group?: {
    id: string;
    name: string;
    campusId: string;
    campusSlug: string;
    campusName: string;
    ownerId: string;
    createdAt: string;
  } | null;
  inviteCode?: string | null;
  members?: GroupMember[];
};

export type HiveGroup = NonNullable<RpcGroupPayload['group']> & {
  inviteCode: string | null;
};

export type GroupMember = {
  userId: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type GroupVote = {
  group_id: string;
  user_id: string;
  property_id: string;
  decision: ListingDecision;
  score: number | null;
  decided_at: string;
};

export type GroupVoteMember = {
  userId: string;
  name: string;
  decision: ListingDecision | 'waiting';
};

export type GroupOutcome = {
  propertyId: string;
  status: 'matched' | 'partial';
  likes: number;
  passes: number;
  waiting: number;
  lastActivityAt: string;
  members: GroupVoteMember[];
};

type HiveGroupContextValue = {
  authReady: boolean;
  authUserId: string | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  group: HiveGroup | null;
  members: GroupMember[];
  votes: GroupVote[];
  outcomes: GroupOutcome[];
  matchedOutcomes: GroupOutcome[];
  partialOutcomes: GroupOutcome[];
  matchedIds: string[];
  partialIds: string[];
  outcomesByListing: Record<string, GroupOutcome>;
  validateGroupInvite: (inviteCode: string) => Promise<boolean>;
  createGroup: (nextPreferences?: Partial<SearchPreferences>, groupName?: string) => Promise<void>;
  joinGroup: (inviteCode: string, nextPreferences?: Partial<SearchPreferences>) => Promise<void>;
  renameGroup: (name: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
  removeMember: (memberUserId: string) => Promise<void>;
  refresh: () => Promise<void>;
  deleteSyncedDecision: (listingId: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const HiveGroupContext = createContext<HiveGroupContextValue | null>(null);

export function HiveGroupProvider({ children }: { children: ReactNode }) {
  const { hydrated, preferences, decisions } = useHiveAppState();
  const [authReady, setAuthReady] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<HiveGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [votes, setVotes] = useState<GroupVote[]>([]);
  const lastSyncedKey = useRef<string>('');
  const lastSyncedDecisions = useRef<Record<string, ListingDecisionRecord> | null>(null);
  const lastSyncedGroupId = useRef<string | null>(null);
  const activeGroupId = group?.id ?? null;
  const preferencesKey = useMemo(() => JSON.stringify(preferences), [preferences]);
  const decisionsKey = useMemo(() => JSON.stringify(decisions), [decisions]);

  const ensureSession = useCallback(async () => {
    const configError = getSupabaseConfigError();
    if (configError) throw new Error(configError);

    const supabase = getSupabaseClient();
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) {
      throw new Error(`Unable to read Hive session: ${sessionResult.error.message}`);
    }

    const existingUser = sessionResult.data.session?.user;
    if (existingUser) return existingUser;

    const signInResult = await supabase.auth.signInAnonymously();
    if (signInResult.error) {
      throw new Error(`Username-only login is not available yet: ${signInResult.error.message}`);
    }
    if (!signInResult.data.user) {
      throw new Error('Username-only login did not return a user.');
    }

    return signInResult.data.user;
  }, []);

  const upsertProfile = useCallback(async (userId: string, nextPreferences: SearchPreferences) => {
    const supabase = getSupabaseClient();
    const username = normalizeUsername(nextPreferences.username);
    const campusSlug = normalizeCampusSlug(nextPreferences.campusSlug || nextPreferences.campusName);
    const { error: profileError } = await supabase
      .from('app_profiles')
      .upsert(
        {
          id: userId,
          username,
          campus_slug: campusSlug,
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      throw new Error(`Unable to sync profile: ${profileError.message}`);
    }
  }, []);

  const loadGroup = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data, error: groupError } = await supabase.rpc('get_my_group');

    if (groupError) {
      throw new Error(`Unable to load group: ${groupError.message}`);
    }

    const payload = parseGroupPayload(data);
    if (!payload?.group) {
      setGroup(null);
      setMembers([]);
      setVotes([]);
      return null;
    }

    const nextGroup: HiveGroup = {
      ...payload.group,
      inviteCode: payload.inviteCode ?? null,
    };
    const nextMembers = payload.members ?? [];

    setGroup(nextGroup);
    setMembers(nextMembers);

    const { data: voteRows, error: voteError } = await supabase
      .from('group_listing_votes')
      .select('group_id,user_id,property_id,decision,score,decided_at')
      .eq('group_id', nextGroup.id)
      .order('decided_at', { ascending: false });

    if (voteError) {
      throw new Error(`Unable to load group votes: ${voteError.message}`);
    }

    setVotes((voteRows ?? []) as GroupVote[]);
    return nextGroup;
  }, []);

  const refresh = useCallback(async () => {
    if (!hydrated) return;

    setLoading(true);
    setError(null);

    try {
      const user = await ensureSession();
      setAuthUserId(user.id);
      setAuthReady(true);
      await upsertProfile(user.id, preferences);
      await loadGroup();
    } catch (nextError) {
      setError(readErrorMessage(nextError));
      setAuthReady(false);
    } finally {
      setLoading(false);
    }
  }, [ensureSession, hydrated, loadGroup, preferences, upsertProfile]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const syncDecisions = useCallback(
    async (nextDecisions: Record<string, ListingDecisionRecord>, activeGroupId: string | null) => {
      if (!authUserId) return false;

      const entries = Object.entries(nextDecisions);
      const previousDecisions = lastSyncedDecisions.current;
      const shouldBackfillUserDecisions = previousDecisions === null;
      const shouldBackfillGroupVotes = Boolean(activeGroupId) && lastSyncedGroupId.current !== activeGroupId;
      const supabase = getSupabaseClient();

      await upsertProfile(authUserId, preferences);

      const changedUserEntries = entries.filter(([propertyId, record]) => {
        return shouldBackfillUserDecisions || !areDecisionRecordsEqual(record, previousDecisions?.[propertyId]);
      });
      const changedVoteEntries = activeGroupId
        ? entries.filter(([propertyId, record]) => {
            return (
              shouldBackfillUserDecisions ||
              shouldBackfillGroupVotes ||
              !areDecisionRecordsEqual(record, previousDecisions?.[propertyId])
            );
          })
        : [];
      const removedPropertyIds =
        previousDecisions && !shouldBackfillUserDecisions
          ? Object.keys(previousDecisions).filter((propertyId) => !nextDecisions[propertyId])
          : [];

      if (removedPropertyIds.length > 0) {
        const { error: deleteDecisionError } = await supabase
          .from('user_listing_decisions')
          .delete()
          .eq('user_id', authUserId)
          .in('property_id', removedPropertyIds);

        if (deleteDecisionError) {
          throw new Error(`Unable to remove listing decisions: ${deleteDecisionError.message}`);
        }

        if (activeGroupId) {
          const { error: deleteVoteError } = await supabase
            .from('group_listing_votes')
            .delete()
            .eq('group_id', activeGroupId)
            .eq('user_id', authUserId)
            .in('property_id', removedPropertyIds);

          if (deleteVoteError) {
            throw new Error(`Unable to remove group votes: ${deleteVoteError.message}`);
          }
        }
      }

      if (changedUserEntries.length > 0) {
        const decisionRows = changedUserEntries.map(([propertyId, record]) => ({
          user_id: authUserId,
          property_id: propertyId,
          decision: record.decision,
          score: record.score ?? null,
          decided_at: record.decidedAt,
        }));

        const { error: decisionError } = await supabase
          .from('user_listing_decisions')
          .upsert(decisionRows, { onConflict: 'user_id,property_id' });

        if (decisionError) {
          throw new Error(`Unable to sync listing decisions: ${decisionError.message}`);
        }
      }

      if (!activeGroupId) return true;

      if (changedVoteEntries.length === 0) return true;

      const voteRows = changedVoteEntries.map(([propertyId, record]) => ({
        group_id: activeGroupId,
        user_id: authUserId,
        property_id: propertyId,
        decision: record.decision,
        score: record.score ?? null,
        decided_at: record.decidedAt,
      }));

      const { error: voteError } = await supabase
        .from('group_listing_votes')
        .upsert(voteRows, { onConflict: 'group_id,user_id,property_id' });

      if (voteError) {
        throw new Error(`Unable to sync group votes: ${voteError.message}`);
      }

      return true;
    },
    [authUserId, preferences, upsertProfile],
  );

  useEffect(() => {
    if (!hydrated || !authReady || !authUserId) return;

    const syncKey = `${authUserId}|${group?.id ?? 'solo'}|${preferencesKey}|${decisionsKey}`;
    if (lastSyncedKey.current === syncKey) return;

    let mounted = true;
    setSyncing(true);

    syncDecisions(decisions, group?.id ?? null)
      .then((didSync) => {
        if (mounted && didSync) {
          lastSyncedKey.current = syncKey;
          lastSyncedDecisions.current = cloneDecisionSnapshot(decisions);
          lastSyncedGroupId.current = group?.id ?? null;
        }

        if (mounted && group?.id) {
          return loadGroup();
        }
        return null;
      })
      .catch((nextError) => {
        if (mounted) setError(readErrorMessage(nextError));
      })
      .finally(() => {
        if (mounted) setSyncing(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    authReady,
    authUserId,
    decisions,
    decisionsKey,
    group?.id,
    hydrated,
    loadGroup,
    preferencesKey,
    syncDecisions,
  ]);

  const createGroup = useCallback(async (nextPreferences?: Partial<SearchPreferences>, groupName?: string) => {
    setLoading(true);
    setError(null);

    try {
      const user = await ensureSession();
      setAuthUserId(user.id);
      setAuthReady(true);
      const actionPreferences = { ...preferences, ...nextPreferences };
      const normalizedGroupName = normalizeOptionalGroupName(groupName);

      const supabase = getSupabaseClient();
      const { error: createError } = await supabase.rpc('create_housing_group', {
        profile_username: normalizeUsername(actionPreferences.username),
        profile_campus_slug: normalizeCampusSlug(actionPreferences.campusSlug || actionPreferences.campusName),
      });

      if (createError) {
        throw new Error(`Unable to create group: ${createError.message}`);
      }

      if (normalizedGroupName) {
        const { error: renameError } = await supabase.rpc('rename_active_group', {
          new_name: normalizedGroupName,
        });

        if (renameError) {
          throw new Error(`Unable to name group: ${renameError.message}`);
        }
      }

      await loadGroup();
      lastSyncedKey.current = '';
    } catch (nextError) {
      setError(readErrorMessage(nextError));
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [ensureSession, loadGroup, preferences]);

  const joinGroup = useCallback(
    async (inviteCode: string, nextPreferences?: Partial<SearchPreferences>) => {
      setLoading(true);
      setError(null);

      try {
        const user = await ensureSession();
        setAuthUserId(user.id);
        setAuthReady(true);
        const actionPreferences = { ...preferences, ...nextPreferences };

        const supabase = getSupabaseClient();
        const { error: joinError } = await supabase.rpc('join_housing_group', {
          invite_code: inviteCode,
          profile_username: normalizeUsername(actionPreferences.username),
          profile_campus_slug: normalizeCampusSlug(actionPreferences.campusSlug || actionPreferences.campusName),
        });

        if (joinError) {
          throw new Error(`Unable to join group: ${joinError.message}`);
        }

        await loadGroup();
        lastSyncedKey.current = '';
      } catch (nextError) {
        setError(readErrorMessage(nextError));
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [ensureSession, loadGroup, preferences],
  );

  const renameGroup = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);

      try {
        const user = await ensureSession();
        setAuthUserId(user.id);
        setAuthReady(true);

        const supabase = getSupabaseClient();
        const { error: renameError } = await supabase.rpc('rename_active_group', {
          new_name: name,
        });

        if (renameError) {
          throw new Error(`Unable to rename group: ${renameError.message}`);
        }

        await loadGroup();
      } catch (nextError) {
        setError(readErrorMessage(nextError));
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [ensureSession, loadGroup],
  );

  const leaveGroup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await ensureSession();

      const supabase = getSupabaseClient();
      const { error: leaveError } = await supabase.rpc('leave_active_group');
      if (leaveError) {
        throw new Error(`Unable to leave group: ${leaveError.message}`);
      }

      setGroup(null);
      setMembers([]);
      setVotes([]);
      lastSyncedKey.current = '';
      lastSyncedGroupId.current = null;
    } catch (nextError) {
      setError(readErrorMessage(nextError));
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [ensureSession]);

  const removeMember = useCallback(
    async (memberUserId: string) => {
      setLoading(true);
      setError(null);

      try {
        await ensureSession();

        const supabase = getSupabaseClient();
        const { error: removeError } = await supabase.rpc('remove_group_member', {
          target_user_id: memberUserId,
        });

        if (removeError) {
          throw new Error(`Unable to remove member: ${removeError.message}`);
        }

        await loadGroup();
        lastSyncedKey.current = '';
      } catch (nextError) {
        setError(readErrorMessage(nextError));
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [ensureSession, loadGroup],
  );

  const deleteSyncedDecision = useCallback(
    async (listingId: string) => {
      if (!authUserId) return;

      const supabase = getSupabaseClient();
      const { error: decisionError } = await supabase
        .from('user_listing_decisions')
        .delete()
        .eq('user_id', authUserId)
        .eq('property_id', listingId);

      if (decisionError) {
        setError(`Unable to remove listing decision: ${decisionError.message}`);
        return;
      }

      if (activeGroupId) {
        const { error: voteError } = await supabase
          .from('group_listing_votes')
          .delete()
          .eq('group_id', activeGroupId)
          .eq('user_id', authUserId)
          .eq('property_id', listingId);

        if (voteError) {
          setError(`Unable to remove group vote: ${voteError.message}`);
          return;
        }

        await loadGroup();
      }

      lastSyncedKey.current = '';
      lastSyncedDecisions.current = omitDecision(lastSyncedDecisions.current, listingId);
    },
    [activeGroupId, authUserId, loadGroup],
  );

  const deleteAccount = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await ensureSession();

      const supabase = getSupabaseClient();
      const { error: deleteError } = await supabase.rpc('delete_account');
      if (deleteError) {
        throw new Error(`Unable to delete account: ${deleteError.message}`);
      }

      // Drop the now-orphaned anonymous session and reset in-memory group state.
      await supabase.auth.signOut();

      setGroup(null);
      setMembers([]);
      setVotes([]);
      setAuthUserId(null);
      setAuthReady(false);
      lastSyncedKey.current = '';
      lastSyncedDecisions.current = null;
      lastSyncedGroupId.current = null;
    } catch (nextError) {
      setError(readErrorMessage(nextError));
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [ensureSession]);

  const outcomes = useMemo(() => buildGroupOutcomes(members, votes), [members, votes]);
  const matchedOutcomes = useMemo(() => outcomes.filter((outcome) => outcome.status === 'matched'), [outcomes]);
  const partialOutcomes = useMemo(() => outcomes.filter((outcome) => outcome.status === 'partial'), [outcomes]);
  const outcomesByListing = useMemo(
    () => Object.fromEntries(outcomes.map((outcome) => [outcome.propertyId, outcome])),
    [outcomes],
  );

  const validateGroupInvite = useCallback(async (inviteCode: string) => {
    const user = await ensureSession();
    setAuthUserId(user.id);
    setAuthReady(true);

    const supabase = getSupabaseClient();
    const { data, error: validateError } = await supabase.rpc('validate_group_invite', {
      raw_invite_code: inviteCode,
    });

    if (validateError) {
      throw new Error(`Unable to check group code: ${validateError.message}`);
    }

    return Boolean(data);
  }, [ensureSession]);

  const value = useMemo<HiveGroupContextValue>(
    () => ({
      authReady,
      authUserId,
      loading,
      syncing,
      error,
      group,
      members,
      votes,
      outcomes,
      matchedOutcomes,
      partialOutcomes,
      matchedIds: matchedOutcomes.map((outcome) => outcome.propertyId),
      partialIds: partialOutcomes.map((outcome) => outcome.propertyId),
      outcomesByListing,
      validateGroupInvite,
      createGroup,
      joinGroup,
      renameGroup,
      leaveGroup,
      removeMember,
      refresh,
      deleteSyncedDecision,
      deleteAccount,
    }),
    [
      authReady,
      authUserId,
      createGroup,
      deleteAccount,
      deleteSyncedDecision,
      error,
      group,
      joinGroup,
      leaveGroup,
      loading,
      matchedOutcomes,
      members,
      outcomes,
      outcomesByListing,
      partialOutcomes,
      renameGroup,
      removeMember,
      refresh,
      syncing,
      validateGroupInvite,
      votes,
    ],
  );

  return <HiveGroupContext value={value}>{children}</HiveGroupContext>;
}

export function useHiveGroup() {
  const context = use(HiveGroupContext);

  if (!context) {
    throw new Error('useHiveGroup must be used inside HiveGroupProvider');
  }

  return context;
}

function buildGroupOutcomes(members: GroupMember[], votes: GroupVote[]): GroupOutcome[] {
  const activeMemberIds = new Set(members.map((member) => member.userId));
  const votesByListing = new Map<string, GroupVote[]>();

  for (const vote of votes) {
    if (!activeMemberIds.has(vote.user_id)) continue;

    const current = votesByListing.get(vote.property_id) ?? [];
    current.push(vote);
    votesByListing.set(vote.property_id, current);
  }

  return [...votesByListing.entries()]
    .map(([propertyId, listingVotes]) => {
      const voteByUser = new Map(listingVotes.map((vote) => [vote.user_id, vote]));
      const memberVotes: GroupVoteMember[] = members.map((member) => ({
        userId: member.userId,
        name: member.name,
        decision: voteByUser.get(member.userId)?.decision ?? 'waiting',
      }));
      const likes = memberVotes.filter((member) => member.decision === 'liked').length;
      const passes = memberVotes.filter((member) => member.decision === 'passed').length;
      const waiting = memberVotes.filter((member) => member.decision === 'waiting').length;
      const lastActivityAt = listingVotes.reduce((latest, vote) => {
        return vote.decided_at > latest ? vote.decided_at : latest;
      }, '');

      if (likes === 0) return null;

      return {
        propertyId,
        status: likes === members.length && waiting === 0 && passes === 0 ? 'matched' : 'partial',
        likes,
        passes,
        waiting,
        lastActivityAt,
        members: memberVotes,
      } satisfies GroupOutcome;
    })
    .filter((outcome): outcome is GroupOutcome => Boolean(outcome))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'matched' ? -1 : 1;
      return b.lastActivityAt.localeCompare(a.lastActivityAt);
    });
}

function areDecisionRecordsEqual(left: ListingDecisionRecord | undefined, right: ListingDecisionRecord | undefined) {
  if (!left || !right) return false;

  return (
    left.decision === right.decision &&
    left.decidedAt === right.decidedAt &&
    (left.score ?? null) === (right.score ?? null)
  );
}

function cloneDecisionSnapshot(decisions: Record<string, ListingDecisionRecord>) {
  return Object.fromEntries(
    Object.entries(decisions).map(([propertyId, record]) => [propertyId, { ...record }]),
  );
}

function omitDecision(
  decisions: Record<string, ListingDecisionRecord> | null,
  listingId: string,
): Record<string, ListingDecisionRecord> | null {
  if (!decisions || !decisions[listingId]) return decisions;

  const next = { ...decisions };
  delete next[listingId];
  return next;
}

function parseGroupPayload(value: unknown): RpcGroupPayload | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as RpcGroupPayload;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') return value as RpcGroupPayload;

  return null;
}

function normalizeUsername(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 ? trimmed.slice(0, 32) : 'Hive user';
}

function normalizeCampusSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized || 'ucla';
}

function normalizeOptionalGroupName(value: string | undefined) {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
