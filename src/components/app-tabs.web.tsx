import {
  TabList,
  TabListProps,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';

const tabs = [
  {
    name: 'discover',
    href: '/discover',
    label: 'Discover',
    icon: { ios: 'magnifyingglass', android: 'travel_explore', web: 'travel_explore' },
  },
  {
    name: 'saved',
    href: '/saved',
    label: 'Saved',
    icon: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  },
  {
    name: 'groups',
    href: '/groups',
    label: 'Groups',
    icon: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
  },
  {
    name: 'profile',
    href: '/profile',
    label: 'Profile',
    icon: { ios: 'person.crop.circle.fill', android: 'person', web: 'person' },
  },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: (typeof tabs)[number]['icon'] }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButtonPressable, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'primary' : 'backgroundElement'}
        style={[
          styles.tabButtonView,
          {
            borderColor: isFocused ? 'transparent' : colors.border,
          },
        ]}>
        <SymbolView
          name={icon}
          tintColor={isFocused ? colors.primaryText : colors.textSecondary}
          size={18}
        />
        <ThemedText
          type="caption"
          style={{ color: isFocused ? colors.primaryText : colors.textSecondary }}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="surfaceGlass"
        style={[styles.innerContainer, { borderColor: colors.border, shadowColor: colors.shadow }]}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Hive
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    minHeight: 64,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    ...Shadows.soft,
  },
  brandText: {
    marginRight: 'auto',
  },
  tabButtonPressable: {
    flex: 1,
    maxWidth: 132,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minHeight: 44,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
});
