import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BudgetRangeStage,
  CampusRadiusStage,
  HomeSetupStage,
  type MoveInMonth,
} from '@/components/hive/onboarding-controls';
import { IconButton, IconGlyph, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHiveGroup } from '@/lib/group-state';
import { useHiveAppState, type SearchPreferences } from '@/lib/hive-state';

type OnboardingStep =
  | 'identity'
  | 'group'
  | 'rent'
  | 'commute'
  | 'room'
  | 'review';

type OnboardingState = {
  username: string;
  campus: string;
  groupCode: string;
  groupMode: 'join' | 'create' | 'skip' | null;
  budgetMin: number;
  budgetMax: number;
  moveIn: MoveInMonth;
  distanceMiles: number;
  bedrooms: number;
  bathrooms: number;
};

const steps: { key: OnboardingStep; eyebrow: string; title: string; subtitle?: string }[] = [
  {
    key: 'identity',
    eyebrow: 'Your search',
    title: 'Start with your search',
    subtitle: 'Choose a username and campus.',
  },
  {
    key: 'group',
    eyebrow: 'Private group',
    title: 'Add your group',
    subtitle: 'Use a private code or create one.',
  },
  {
    key: 'rent',
    eyebrow: 'Budget',
    title: "What's your budget?",
    subtitle: 'Set the monthly listing range.',
  },
  {
    key: 'commute',
    eyebrow: 'Distance to campus',
    title: 'How close do you want to be?',
    subtitle: 'We rank homes inside this radius first.',
  },
  {
    key: 'room',
    eyebrow: 'The home',
    title: 'Size and timing',
    subtitle: 'Set the shape of the place and when you need it.',
  },
  {
    key: 'review',
    eyebrow: 'Ready',
    title: 'Ready to swipe',
    subtitle: 'Group matches appear after everyone votes.',
  },
];

const initialState: OnboardingState = {
  username: 'Rey',
  campus: 'UCLA',
  groupCode: '',
  groupMode: null,
  budgetMin: 600,
  budgetMax: 1550,
  moveIn: 'Aug',
  distanceMiles: 1.25,
  bedrooms: 3,
  bathrooms: 1,
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const theme = useTheme();
  const { preferences, updatePreferences } = useHiveAppState();
  const { createGroup, joinGroup } = useHiveGroup();
  const [state, setState] = useState<OnboardingState>(() => stateFromPreferences(preferences));
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.Value(0));
  const step = steps[stepIndex];
  const canContinue = useMemo(() => {
    if (step.key === 'identity') return state.username.trim().length >= 2 && state.campus.trim().length >= 2;
    if (step.key === 'group') return Boolean(state.groupMode) || state.groupCode.trim().length > 0;
    return true;
  }, [state, step.key]);

  useEffect(() => {
    fade.setValue(0);
    translate.setValue(14);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, stepIndex, translate]);

  const update = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const goNext = async () => {
    if (!canContinue || submitting) return;
    if (stepIndex === steps.length - 1) {
      setSubmitting(true);
      const nextPreferences = {
        username: state.username.trim(),
        campusName: state.campus.trim().toUpperCase(),
        campusSlug: state.campus.trim().toLowerCase(),
        budgetMin: state.budgetMin,
        budgetMax: state.budgetMax,
        moveIn: state.moveIn,
        distanceMiles: state.distanceMiles,
        bedrooms: state.bedrooms,
        bathrooms: state.bathrooms,
      };

      updatePreferences(nextPreferences);

      try {
        if (state.groupMode === 'create') {
          await createGroup(nextPreferences);
        } else if (state.groupMode === 'join' && state.groupCode.trim()) {
          await joinGroup(state.groupCode, nextPreferences);
        }

        router.replace('/discover');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      if (preview === '1' && router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/sign-in');
      return;
    }
    setStepIndex((current) => current - 1);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View pointerEvents="none" style={styles.textureLayer}>
        {textureRows.map((row) => (
          <View
            key={row}
            style={[
              styles.textureLine,
              {
                top: row,
                backgroundColor: theme.border,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.screen}>
        <View style={styles.top}>
          <IconButton
            icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
            label="Back"
            size="sm"
            onPress={goBack}
          />
          <View style={styles.progressBubbles}>
            {steps.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.progressBubble,
                  {
                    backgroundColor: index <= stepIndex ? theme.primary : theme.backgroundElement,
                    opacity: index === stepIndex || index < stepIndex ? 1 : 0.82,
                  },
                ]}
              />
            ))}
          </View>
          <ThemedText type="caption" themeColor="textTertiary">
            {stepIndex + 1}/{steps.length}
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerCopy}>
            <ThemedText type="label" themeColor="textTertiary">
              {step.eyebrow}
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              {step.title}
            </ThemedText>
            {step.subtitle ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {step.subtitle}
              </ThemedText>
            ) : null}
          </View>

          <Animated.View
            style={[
              styles.body,
              {
                opacity: fade,
                transform: [{ translateY: translate }],
              },
            ]}>
            {renderStep(step.key, state, update)}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <PrimaryAction disabled={!canContinue || submitting} onPress={goNext}>
            {submitting ? 'Saving' : stepIndex === steps.length - 1 ? 'Start swiping' : 'Continue'}
          </PrimaryAction>
        </View>
      </View>
    </SafeAreaView>
  );
}

function stateFromPreferences(preferences: SearchPreferences): OnboardingState {
  return {
    ...initialState,
    username: preferences.username,
    campus: preferences.campusName,
    budgetMin: preferences.budgetMin,
    budgetMax: preferences.budgetMax,
    moveIn: preferences.moveIn,
    distanceMiles: preferences.distanceMiles,
    bedrooms: preferences.bedrooms,
    bathrooms: preferences.bathrooms,
  };
}

const textureRows = [104, 188, 272, 356, 440, 524, 608, 692, 776];

function renderStep(
  step: OnboardingStep,
  state: OnboardingState,
  update: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void,
) {
  switch (step) {
    case 'identity':
      return (
        <View style={styles.identityStage}>
          <Image source={require('../../../hivelogoappicon.png')} style={styles.miniLogo} contentFit="cover" />
          <View style={styles.inputStack}>
            <LargeInput
              label="Username"
              value={state.username}
              placeholder="choose a username"
              onChangeText={(value) => update('username', value)}
            />
            <LargeInput
              label="Campus"
              value={state.campus}
              placeholder="UCLA"
              onChangeText={(value) => update('campus', value)}
            />
          </View>
        </View>
      );
    case 'group':
      return (
        <View style={styles.stage}>
          <LargeInput
            label="Group code"
            value={state.groupCode}
            placeholder="HIVE-A1B2C3"
            onChangeText={(value) => {
              update('groupCode', value.toUpperCase());
              update('groupMode', value.trim().length > 0 ? 'join' : null);
            }}
          />
          <View style={styles.optionStack}>
            <OptionRow
              label="Join with this code"
              detail={state.groupCode ? `Request access to ${state.groupCode}` : 'Paste a private invite code above'}
              selected={state.groupMode === 'join'}
              disabled={!state.groupCode}
              onPress={() => state.groupCode && update('groupMode', 'join')}
              icon={hiveSymbol({ ios: 'person.2.fill', android: 'group', web: 'group' })}
            />
            <OptionRow
              label="Create empty group"
              detail="Invite roommates after onboarding"
              selected={state.groupMode === 'create'}
              onPress={() => update('groupMode', 'create')}
              icon={hiveSymbol({ ios: 'plus', android: 'add', web: 'add' })}
            />
            <OptionRow
              label="Skip for now"
              detail="Swipe solo and add a group later"
              selected={state.groupMode === 'skip'}
              onPress={() => update('groupMode', 'skip')}
              icon={hiveSymbol({ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' })}
            />
          </View>
        </View>
      );
    case 'rent':
      return (
        <BudgetRangeStage
          min={state.budgetMin}
          max={state.budgetMax}
          onChange={(min, max) => {
            update('budgetMin', min);
            update('budgetMax', max);
          }}
        />
      );
    case 'commute':
      return (
        <CampusRadiusStage
          miles={state.distanceMiles}
          onChange={(value) => update('distanceMiles', value)}
        />
      );
    case 'room':
      return (
        <HomeSetupStage
          bedrooms={state.bedrooms}
          bathrooms={state.bathrooms}
          moveIn={state.moveIn}
          onBedroomsChange={(value) => update('bedrooms', value)}
          onBathroomsChange={(value) => update('bathrooms', value)}
          onMoveInChange={(value) => update('moveIn', value)}
        />
      );
    case 'review':
      return <ReviewStage state={state} />;
    default:
      return null;
  }
}

function LargeInput({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.largeInputWrap}>
      <ThemedText type="label" themeColor="textTertiary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        autoCapitalize="none"
        placeholderTextColor={theme.textTertiary}
        style={[
          styles.largeInput,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
      />
    </View>
  );
}

function OptionRow({
  label,
  detail,
  icon,
  selected,
  disabled,
  compact,
  onPress,
}: {
  label: string;
  detail?: string;
  icon?: Parameters<typeof hiveSymbol>[0];
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        compact && styles.optionCompact,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.42 : pressed ? 0.78 : 1,
          shadowColor: theme.shadow,
        },
      ]}>
      {icon ? (
        <View style={[styles.optionIcon, { backgroundColor: selected ? theme.inverse : theme.backgroundElement }]}>
          <IconGlyph name={icon} color={selected ? theme.primary : theme.textSecondary} size={18} />
        </View>
      ) : null}
      <View style={styles.optionCopy}>
        <ThemedText type="smallBold" style={{ color: selected ? theme.inverse : theme.text }}>
          {label}
        </ThemedText>
        {detail ? (
          <ThemedText type="caption" style={{ color: selected ? theme.inverse : theme.textSecondary }}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? theme.inverse : theme.border }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: theme.inverse }]} /> : null}
      </View>
    </Pressable>
  );
}

function ReviewStage({ state }: { state: OnboardingState }) {
  const groupLabel =
    state.groupMode === 'create'
      ? 'New group'
      : state.groupMode === 'join'
        ? state.groupCode || 'Invite code'
        : 'Solo for now';

  return (
    <View style={styles.reviewStage}>
      <View style={styles.reviewHero}>
        <Image source={require('../../../hivelogoappicon.png')} style={styles.reviewLogo} contentFit="cover" />
        <View style={styles.reviewHeroCopy}>
          <ThemedText type="subtitle">@{state.username || 'username'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {state.campus} apartment deck
          </ThemedText>
        </View>
      </View>
      <View style={styles.reviewList}>
        <ReviewItem label="Group" value={groupLabel} />
        <ReviewItem label="Budget" value={formatBudgetRange(state.budgetMin, state.budgetMax)} />
        <ReviewItem label="Radius" value={`${formatMiles(state.distanceMiles)} mi from UCLA`} />
        <ReviewItem label="Move-in" value={`${state.moveIn} 2026`} />
        <ReviewItem label="Room" value={`${formatBedrooms(state.bedrooms)}, ${state.bathrooms} bath`} />
      </View>
    </View>
  );
}

function formatBudgetRange(min: number, max: number) {
  return `$${min.toLocaleString('en-US')} - $${max.toLocaleString('en-US')}`;
}

function formatMiles(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatBedrooms(value: number) {
  return value === 0 ? 'Studio' : `${value} bed`;
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewItem}>
      <ThemedText type="caption" themeColor="textTertiary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function PrimaryAction({
  children,
  disabled,
  onPress,
}: {
  children: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryAction,
        {
          backgroundColor: theme.primary,
          opacity: disabled ? 0.36 : pressed ? 0.78 : 1,
          shadowColor: theme.shadow,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.inverse }}>
        {children}
      </ThemedText>
      <IconGlyph
        name={hiveSymbol({ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' })}
        color={theme.inverse}
        size={17}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  textureLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  textureLine: {
    position: 'absolute',
    left: -24,
    right: -24,
    height: StyleSheet.hairlineWidth,
    opacity: 0.16,
    transform: [{ rotate: '-2deg' }],
  },
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  top: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  progressBubbles: {
    flex: 1,
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  progressBubble: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
  },
  body: {
    gap: Spacing.four,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  headerCopy: {
    gap: Spacing.one,
  },
  title: {
    maxWidth: 430,
    fontSize: 36,
    lineHeight: 41,
  },
  subtitle: {
    maxWidth: 360,
  },
  identityStage: {
    gap: Spacing.five,
    alignItems: 'center',
  },
  miniLogo: {
    width: 116,
    height: 116,
    borderRadius: Radius.xl,
  },
  inputStack: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  stage: {
    gap: Spacing.four,
  },
  largeInputWrap: {
    gap: Spacing.two,
  },
  largeInput: {
    minHeight: 64,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
  },
  optionStack: {
    gap: Spacing.two,
  },
  option: {
    minHeight: 64,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    ...Shadows.soft,
  },
  optionCompact: {
    minHeight: 50,
    paddingVertical: Spacing.two,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reviewStage: {
    gap: Spacing.four,
  },
  reviewHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  reviewLogo: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
  },
  reviewHeroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  reviewList: {
    gap: Spacing.two,
  },
  reviewItem: {
    minHeight: 56,
    justifyContent: 'center',
    gap: Spacing.half,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(142, 118, 148, 0.35)',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  primaryAction: {
    minHeight: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    ...Shadows.card,
  },
});
