import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type HiveTheme = (typeof Colors)[keyof typeof Colors];

export function hiveSymbol(name: SymbolName) {
  return name;
}

export type IconName = SymbolName;

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
};

export function Screen({ children, scroll = true, padded = true, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const content = [
    styles.screenContent,
    padded && styles.screenPadded,
    contentStyle,
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={content}>
          {children}
        </ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type HiveLogoProps = {
  size?: number;
  showWordmark?: boolean;
};

export function HiveLogo({ size = 44, showWordmark = true }: HiveLogoProps) {
  const theme = useTheme();
  const markRadius = Math.round(size * 0.34);

  return (
    <View style={styles.logoRow}>
      <View
        style={[
          styles.logoMark,
          {
            width: size,
            height: size,
            borderRadius: markRadius,
            backgroundColor: theme.text,
          },
        ]}>
        <ThemedText
          type="sectionTitle"
          style={[styles.logoLetter, { color: theme.inverse, fontSize: size * 0.52 }]}>
          H
        </ThemedText>
        <View
          style={[
            styles.logoSpark,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.08,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>
      {showWordmark ? (
        <ThemedText type="title" style={styles.logoWordmark}>
          Hive
        </ThemedText>
      ) : null}
    </View>
  );
}

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? (
          <ThemedText type="label" themeColor="textTertiary">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.headerSubtitle}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

type IconGlyphProps = {
  name: IconName;
  size?: number;
  color?: string;
};

export function IconGlyph({ name, size = 18, color }: IconGlyphProps) {
  const theme = useTheme();

  return <SymbolView name={name} tintColor={color ?? theme.text} size={size} />;
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'primary' | 'accent' | 'gold' | 'danger';
};

export function IconButton({
  icon,
  label,
  onPress,
  selected,
  disabled,
  size = 'md',
  tone = 'neutral',
}: IconButtonProps) {
  const theme = useTheme();
  const dimension = size === 'sm' ? 38 : size === 'lg' ? 58 : 46;
  const toneColor = getToneColor(theme, tone);
  const bg = selected ? toneColor : theme.surface;
  const iconColor = selected ? theme.primaryText : toneColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: bg,
          borderColor: selected ? toneColor : theme.border,
          opacity: disabled ? 0.42 : pressed ? 0.72 : 1,
          shadowColor: theme.shadow,
        },
      ]}>
      <IconGlyph name={icon} color={iconColor} size={size === 'lg' ? 25 : 20} />
    </Pressable>
  );
}

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
}: ButtonProps) {
  const theme = useTheme();
  const colors = getButtonColors(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        },
      ]}>
      {leftIcon ? <IconGlyph name={leftIcon} color={colors.text} size={17} /> : null}
      <ThemedText type="smallBold" style={{ color: colors.text }}>
        {children}
      </ThemedText>
      {rightIcon ? <IconGlyph name={rightIcon} color={colors.text} size={17} /> : null}
    </Pressable>
  );
}

type SegmentedControlProps<T extends string> = {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: selected ? theme.primary : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText
              type="caption"
              style={{ color: selected ? theme.primaryText : theme.textSecondary }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

type PreferenceChipProps = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export function PreferenceChip({ label, icon, selected, onPress, disabled }: PreferenceChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.primarySoft,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.42 : pressed ? 0.76 : 1,
        },
      ]}>
      {icon ? (
        <IconGlyph
          name={icon}
          size={15}
          color={selected ? theme.primaryText : theme.primary}
        />
      ) : null}
      <ThemedText
        type="caption"
        style={{ color: selected ? theme.primaryText : theme.primary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type BadgeProps = {
  children: ReactNode;
  tone?: 'primary' | 'accent' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';
};

export function Badge({ children, tone = 'primary' }: BadgeProps) {
  const theme = useTheme();
  const colors = getBadgeColors(theme, tone);

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <ThemedText type="caption" style={{ color: colors.text }}>
        {children}
      </ThemedText>
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();
  const colors = getBadgeColors(theme, tone);

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: colors.background,
          borderColor: tone === 'neutral' ? theme.border : colors.background,
        },
      ]}>
      <ThemedText type="caption" style={{ color: colors.text }}>
        {children}
      </ThemedText>
    </View>
  );
}

type AvatarProps = {
  name: string;
  source?: string;
  size?: number;
};

export function Avatar({ name, source, size = 34 }: AvatarProps) {
  const theme = useTheme();
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.primarySoft,
          borderColor: theme.surface,
        },
      ]}>
      {source ? (
        <Image source={{ uri: source }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <ThemedText type="caption" style={{ color: theme.primary }}>
          {initials}
        </ThemedText>
      )}
    </View>
  );
}

type AvatarStackProps = {
  people: AvatarProps[];
  size?: number;
  max?: number;
};

export function AvatarStack({ people, size = 32, max = 4 }: AvatarStackProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <View style={styles.avatarStack}>
      {visible.map((person, index) => (
        <View key={`${person.name}-${index}`} style={{ marginLeft: index === 0 ? 0 : -10 }}>
          <Avatar {...person} size={size} />
        </View>
      ))}
      {overflow > 0 ? (
        <View style={{ marginLeft: -10 }}>
          <Avatar name={`+${overflow}`} size={size} />
        </View>
      ) : null}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();

  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

type EmptyStateProps = {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <IconGlyph name={icon} color={theme.primary} size={28} />
      </View>
      <ThemedText type="sectionTitle" style={styles.centerText}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {body}
      </ThemedText>
      {action}
    </View>
  );
}

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
};

export function Skeleton({ width = '100%', height = 16, radius = Radius.pill }: SkeletonProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.shimmer,
        },
      ]}
    />
  );
}

type ToastProps = {
  icon?: IconName;
  title: string;
  body?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
};

export function Toast({ icon, title, body, tone = 'primary' }: ToastProps) {
  const theme = useTheme();
  const colors = getBadgeColors(theme, tone);

  return (
    <View style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
      {icon ? (
        <View style={[styles.toastIcon, { backgroundColor: colors.background }]}>
          <IconGlyph name={icon} color={colors.text} size={18} />
        </View>
      ) : null}
      <View style={styles.toastCopy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {body ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {body}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

type BottomSheetProps = {
  visible: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function BottomSheet({ visible, title, children, footer, onClose }: BottomSheetProps) {
  const theme = useTheme();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.sheetScrim, { backgroundColor: theme.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <ThemedText type="sectionTitle">{title}</ThemedText>
          <IconButton
            icon={hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' })}
            label="Close"
            size="sm"
            onPress={onClose}
          />
        </View>
        <View style={styles.sheetBody}>{children}</View>
        {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  error?: string;
  multiline?: boolean;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  multiline,
}: FormFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.fieldWrap}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.field,
          {
            minHeight: multiline ? 94 : 52,
            alignItems: multiline ? 'flex-start' : 'center',
            borderColor: error ? theme.danger : theme.border,
            backgroundColor: theme.surface,
          },
        ]}>
        {icon ? <IconGlyph name={icon} color={theme.textSecondary} size={18} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          multiline={multiline}
          style={[
            styles.input,
            {
              color: theme.text,
              fontFamily: Fonts.sans,
              paddingTop: multiline ? 2 : 0,
            },
          ]}
        />
      </View>
      {error ? (
        <ThemedText type="caption" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

function getToneColor(theme: HiveTheme, tone: IconButtonProps['tone']) {
  switch (tone) {
    case 'primary':
      return theme.primary;
    case 'accent':
      return theme.accent;
    case 'gold':
      return theme.gold;
    case 'danger':
      return theme.danger;
    default:
      return theme.text;
  }
}

function getButtonColors(theme: HiveTheme, variant: NonNullable<ButtonProps['variant']>) {
  if (variant === 'secondary') {
    return {
      background: theme.primarySoft,
      border: theme.primarySoft,
      text: theme.primary,
    };
  }

  if (variant === 'ghost') {
    return {
      background: 'transparent',
      border: theme.border,
      text: theme.text,
    };
  }

  if (variant === 'danger') {
    return {
      background: theme.dangerSoft,
      border: theme.dangerSoft,
      text: theme.danger,
    };
  }

  return {
    background: theme.primary,
    border: theme.primary,
    text: theme.primaryText,
  };
}

function getBadgeColors(theme: HiveTheme, tone: NonNullable<BadgeProps['tone']>) {
  switch (tone) {
    case 'accent':
      return { background: theme.accentSoft, text: theme.accent };
    case 'gold':
      return { background: theme.goldSoft, text: '#8B5B00' };
    case 'success':
      return { background: theme.successSoft, text: theme.success };
    case 'warning':
      return { background: theme.warningSoft, text: theme.warning };
    case 'danger':
      return { background: theme.dangerSoft, text: theme.danger };
    case 'neutral':
      return { background: theme.backgroundElement, text: theme.textSecondary };
    default:
      return { background: theme.primarySoft, text: theme.primary };
  }
}

export const semanticColorRoles: ThemeColor[] = [
  'background',
  'surface',
  'primary',
  'accent',
  'gold',
  'success',
  'warning',
  'danger',
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  screenPadded: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logoMark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    transform: [{ rotate: '-8deg' }],
  },
  logoLetter: {
    transform: [{ rotate: '8deg' }],
    lineHeight: 38,
  },
  logoSpark: {
    position: 'absolute',
    right: -4,
    top: -5,
    transform: [{ rotate: '22deg' }],
  },
  logoWordmark: {
    fontSize: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  headerSubtitle: {
    maxWidth: 300,
  },
  headerRight: {
    paddingTop: Spacing.one,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadows.soft,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  segmented: {
    minHeight: 42,
    borderRadius: Radius.pill,
    borderWidth: 1,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    minHeight: 34,
    flex: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  chip: {
    minHeight: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  badge: {
    minHeight: 28,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: 32,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  centerText: {
    textAlign: 'center',
  },
  skeleton: {
    opacity: 0.58,
  },
  toast: {
    minHeight: 68,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    ...Shadows.soft,
  },
  toastIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastCopy: {
    flex: 1,
    gap: 2,
  },
  sheetScrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(137, 106, 148, 0.35)',
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  sheetBody: {
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  sheetFooter: {
    paddingTop: Spacing.three,
  },
  fieldWrap: {
    gap: Spacing.one,
  },
  field: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    padding: 0,
  },
});
