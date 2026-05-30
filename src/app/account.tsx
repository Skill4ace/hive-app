import { useRouter } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';

import { AppHero, AppSection, SettingRow, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, Screen, hiveSymbol } from '@/components/hive/primitives';
import { Spacing } from '@/constants/theme';
import { useHiveGroup } from '@/lib/group-state';
import { useHiveAppState } from '@/lib/hive-state';

export default function AccountScreen() {
  const router = useRouter();
  const { preferences, likedIds, clearAllLocalData } = useHiveAppState();
  const { group, members, deleteAccount } = useHiveGroup();
  const username = preferences.username.trim() || 'hive-member';

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your Hive profile, saved matches, votes, and any group you own. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAccount();
                await clearAllLocalData();
                router.replace('/sign-in');
              } catch (error) {
                Alert.alert(
                  'Could not delete account',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen contentStyle={styles.screen}>
      <AppHero
        eyebrow="Account"
        title="Hive account"
        subtitle="Manage your Hive session, privacy, and account deletion."
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Go back"
            onPress={() => router.back()}
          />
        }
      />

      <AppSection title="Account details">
        <SurfacePanel>
          <SettingRow
            icon={hiveSymbol({ ios: 'person.crop.circle.fill', android: 'person', web: 'person' })}
            title={`@${username}`}
            subtitle="Username shown to your group members"
            value={group ? 'Grouped' : 'Solo'}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'key.fill', android: 'vpn_key', web: 'vpn_key' })}
            title="Anonymous sign-in"
            subtitle="Supabase anonymous auth; no social login connected"
            value="Active"
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'person.2.fill', android: 'group', web: 'group' })}
            title="Private group"
            subtitle={
              group
                ? `${members.length} ${members.length === 1 ? 'member' : 'members'} · ${group.inviteCode ?? 'Invite code'}`
                : 'Create or join a roommate group'
            }
            value={group ? 'Joined' : 'Not joined'}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'hand.raised.fill', android: 'pan_tool', web: 'pan_tool' })}
            title="Privacy"
            subtitle="What roommates can see"
            onPress={() => router.push('/privacy')}
          />
          <SettingRow
            icon={hiveSymbol({ ios: 'heart.fill', android: 'favorite', web: 'favorite' })}
            title="Saved matches"
            subtitle={`${likedIds.length} ${likedIds.length === 1 ? 'listing' : 'listings'} saved on this device`}
          />
          <Button variant="danger" fullWidth onPress={confirmDeleteAccount}>
            Delete account
          </Button>
        </SurfacePanel>
      </AppSection>
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
});
