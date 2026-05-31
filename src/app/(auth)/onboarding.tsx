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
import { getSchool, SCHOOLS } from '@/lib/schools';

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
  campusSlug: string;
  groupCode: string;
  groupMode: 'join' | 'create' | 'skip' | null;
  budgetMin: number;
  budgetMax: number;
  moveIn: MoveInMonth;
  distanceMiles: number;
  bedrooms: number;
  bathrooms: number;
};

const steps: { key: OnboardingStep; title: string; subtitle: string }[] = [
  {
    key: 'identity',
    title: 'Start your search',
    subtitle: 'Choose a username.',
  },
  {
    key: 'group',
    title: 'Add your group',
    subtitle: 'Join roommates or keep searching solo.',
  },
  {
    key: 'rent',
    title: "What's your budget?",
    subtitle: 'Set a monthly range that works.',
  },
  {
    key: 'commute',
    title: 'How close do you want to be?',
    subtitle: 'Prioritize homes near campus.',
  },
  {
    key: 'room',
    title: 'Size and timing',
    subtitle: 'Pick the basics for your search.',
  },
  {
    key: 'review',
    title: 'Ready to swipe',
    subtitle: 'Review your setup before starting.',
  },
];

const initialState: OnboardingState = {
  username: 'Rey',
  campus: 'UCLA',
  campusSlug: 'ucla',
  groupCode: '',
  groupMode: null,
  budgetMin: 600,
  budgetMax: 1550,
  moveIn: 'Aug',
  distanceMiles: 1.25,
  bedrooms: 3,
  bathrooms: 1,
};

const INVITE_CODE_LENGTH = 6;

export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const theme = useTheme();
  const { preferences, updatePreferences } = useHiveAppState();
  const { createGroup, joinGroup, validateGroupInvite } = useHiveGroup();
  const [state, setState] = useState<OnboardingState>(() => stateFromPreferences(preferences));
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [checkingGroupCode, setCheckingGroupCode] = useState(false);
  const [groupCodeError, setGroupCodeError] = useState<string | null>(null);
  const [fade] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.Value(0));
  const step = steps[stepIndex];
  const canContinue = useMemo(() => {
    if (step.key === 'identity') return state.username.trim().length >= 2;
    if (step.key === 'group') {
      return state.groupMode === 'join' ? state.groupCode.trim().length === INVITE_CODE_LENGTH : Boolean(state.groupMode);
    }
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
    if (!canContinue || submitting || checkingGroupCode) return;

    if (step.key === 'group' && state.groupMode === 'join') {
      setCheckingGroupCode(true);
      setGroupCodeError(null);

      try {
        const validInvite = await validateGroupInvite(state.groupCode);
        if (!validInvite) {
          setGroupCodeError('That group code does not look valid.');
          return;
        }
      } catch (error) {
        setGroupCodeError(readErrorMessage(error));
        return;
      } finally {
        setCheckingGroupCode(false);
      }
    }

    if (stepIndex === steps.length - 1) {
      setSubmitting(true);
      const school = getSchool(state.campusSlug);
      const nextPreferences = {
        username: state.username.trim(),
        campusName: school.shortName,
        campusSlug: school.slug,
        budgetMin: state.budgetMin,
        budgetMax: state.budgetMax,
        moveIn: state.moveIn,
        distanceMiles: state.distanceMiles,
        bedrooms: state.bedrooms,
        bathrooms: state.bathrooms,
      };

      try {
        if (state.groupMode === 'create') {
          await createGroup(nextPreferences);
        } else if (state.groupMode === 'join' && state.groupCode.trim()) {
          await joinGroup(state.groupCode, nextPreferences);
        }

        updatePreferences(nextPreferences);
        router.replace('/discover');
      } catch (error) {
        if (state.groupMode === 'join') {
          setGroupCodeError(readErrorMessage(error));
          setStepIndex(1);
        }
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
          <View style={styles.progressSegments}>
            {steps.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor: index <= stepIndex ? theme.primary : theme.backgroundElement,
                    opacity: index <= stepIndex ? 1 : 0.72,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerCopy}>
            <ThemedText type="title" style={styles.title}>
              {step.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {step.subtitle}
            </ThemedText>
          </View>

          <Animated.View
            style={[
              styles.body,
              {
                opacity: fade,
                transform: [{ translateY: translate }],
              },
            ]}>
            {renderStep(step.key, state, update, groupCodeError, () => setGroupCodeError(null))}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <PrimaryAction disabled={!canContinue || submitting || checkingGroupCode} onPress={goNext}>
            {checkingGroupCode ? 'Checking' : submitting ? 'Saving' : stepIndex === steps.length - 1 ? 'Start swiping' : 'Continue'}
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
    campusSlug: preferences.campusSlug,
    budgetMin: preferences.budgetMin,
    budgetMax: preferences.budgetMax,
    moveIn: preferences.moveIn,
    distanceMiles: preferences.distanceMiles,
    bedrooms: preferences.bedrooms,
    bathrooms: preferences.bathrooms,
  };
}

function normalizeInviteInput(value: string) {
  return value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, INVITE_CODE_LENGTH);
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

const textureRows = [104, 188, 272, 356, 440, 524, 608, 692, 776];

function renderStep(
  step: OnboardingStep,
  state: OnboardingState,
  update: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void,
  groupCodeError: string | null,
  clearGroupCodeError: () => void,
) {
  switch (step) {
    case 'identity':
      return (
        <View style={styles.identityStage}>
          <View style={styles.inputStack}>
            <LargeInput
              label="Username"
              value={state.username}
              placeholder="choose a username"
              onChangeText={(value) => update('username', value)}
            />
            <SchoolPicker
              value={state.campusSlug}
              onChange={(slug) => {
                const school = getSchool(slug);
                update('campusSlug', school.slug);
                update('campus', school.shortName);
              }}
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
            placeholder="ABCDEF"
            onChangeText={(value) => {
              const code = normalizeInviteInput(value);
              clearGroupCodeError();
              update('groupCode', code);
              update('groupMode', code.length > 0 ? 'join' : null);
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
              onPress={() => {
                clearGroupCodeError();
                update('groupMode', 'create');
              }}
              icon={hiveSymbol({ ios: 'plus', android: 'add', web: 'add' })}
            />
            <OptionRow
              label="Skip for now"
              detail="Swipe solo and add a group later"
              selected={state.groupMode === 'skip'}
              onPress={() => {
                clearGroupCodeError();
                update('groupMode', 'skip');
              }}
              icon={hiveSymbol({ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' })}
            />
          </View>
          {groupCodeError ? <GroupCodeError message={groupCodeError} /> : null}
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
          campusLabel={getSchool(state.campusSlug).shortName}
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

function SchoolPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.largeInputWrap}>
      <ThemedText type="label" themeColor="textTertiary">
        Campus
      </ThemedText>
      <View style={styles.schoolGrid}>
        {SCHOOLS.map((school) => {
          const selected = school.slug === value;

          return (
            <Pressable
              key={school.slug}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={school.name}
              onPress={() => onChange(school.slug)}
              style={({ pressed }) => [
                styles.schoolChip,
                {
                  backgroundColor: selected ? school.accent : theme.surface,
                  borderColor: selected ? school.accent : theme.border,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: theme.shadow,
                },
              ]}>
              <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                {school.shortName}
              </ThemedText>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={{ color: selected ? 'rgba(255, 255, 255, 0.82)' : theme.textSecondary }}>
                {school.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Listings and the app accent follow your campus.
      </ThemedText>
    </View>
  );
}

function GroupCodeError({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.groupCodeError, { backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft }]}>
      <ThemedText type="caption" style={{ color: theme.danger }}>
        {message}
      </ThemedText>
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
  const school = getSchool(state.campusSlug);
  const groupLabel =
    state.groupMode === 'create'
      ? 'New group'
      : state.groupMode === 'join'
        ? state.groupCode || 'Invite code'
        : 'Solo for now';
  const initial = (state.username.trim().charAt(0) || 'R').toUpperCase();

  return (
    <View style={styles.reviewStage}>
      <View style={styles.reviewHero}>
        <View style={styles.reviewAvatar}>
          <ThemedText type="subtitle" style={styles.reviewAvatarText}>
            {initial}
          </ThemedText>
        </View>
        <View style={styles.reviewHeroCopy}>
          <ThemedText type="subtitle">@{state.username || 'username'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {school.shortName} apartment deck
          </ThemedText>
        </View>
      </View>
      <View style={styles.reviewList}>
        <ReviewItem label="Campus" value={school.shortName} />
        <ReviewItem label="Group" value={groupLabel} />
        <ReviewItem label="Budget" value={formatBudgetRange(state.budgetMin, state.budgetMax)} />
        <ReviewItem label="Radius" value={`${formatMiles(state.distanceMiles)} mi from ${school.shortName}`} />
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
  progressSegments: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
  },
  body: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
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
    gap: Spacing.three,
    alignItems: 'center',
  },
  inputStack: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  stage: {
    width: '100%',
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
    // The display font needs explicit leading at this size or its tall caps
    // clip at the top of the input (matches campusLockedValue's lineHeight).
    lineHeight: 31,
    fontWeight: '700',
  },
  schoolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  schoolChip: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: 2,
    ...Shadows.soft,
  },
  optionStack: {
    gap: Spacing.two,
  },
  groupCodeError: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
    width: '100%',
    gap: Spacing.four,
  },
  reviewHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  reviewAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#241027',
  },
  reviewAvatarText: {
    color: '#FFFFFF',
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
