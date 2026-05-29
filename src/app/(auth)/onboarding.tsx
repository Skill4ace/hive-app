import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconButton, IconGlyph, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OnboardingStep =
  | 'identity'
  | 'group'
  | 'rent'
  | 'moveIn'
  | 'commute'
  | 'room'
  | 'review';

type OnboardingState = {
  username: string;
  campus: string;
  groupCode: string;
  groupMode: 'join' | 'create' | 'skip' | null;
  rent: string;
  moveIn: string;
  commuteMode: string;
  commuteMax: string;
  listingType: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
};

type Option = {
  label: string;
  value: string;
  detail?: string;
  icon?: Parameters<typeof hiveSymbol>[0];
};

const steps: { key: OnboardingStep; title: string; subtitle?: string }[] = [
  {
    key: 'identity',
    title: 'Start with your search',
    subtitle: 'Choose a username and campus.',
  },
  {
    key: 'group',
    title: 'Add your group',
    subtitle: 'Use a private code or create one.',
  },
  {
    key: 'rent',
    title: 'Set monthly rent',
    subtitle: 'Filter by the listing price.',
  },
  {
    key: 'moveIn',
    title: 'Pick move-in',
    subtitle: 'A broad window is enough.',
  },
  {
    key: 'commute',
    title: 'Choose commute',
    subtitle: 'Rank listings by your route.',
  },
  {
    key: 'room',
    title: 'Set room fit',
    subtitle: 'Stay flexible for more options.',
  },
  {
    key: 'review',
    title: 'Ready to swipe',
    subtitle: 'Group matches appear after everyone votes.',
  },
];

const rentOptions: Option[] = [
  { label: 'No max', value: 'No max', detail: 'Show everything' },
  { label: '$1,500', value: '$1,500', detail: 'Tight budget' },
  { label: '$2,000', value: '$2,000', detail: 'Common room range' },
  { label: '$2,500', value: '$2,500', detail: 'More flexibility' },
  { label: '$3,000+', value: '$3,000+', detail: 'Show larger units too' },
];

const moveInOptions: Option[] = [
  { label: 'ASAP', value: 'ASAP', detail: 'Available now' },
  { label: 'August', value: 'August', detail: 'Before fall term' },
  { label: 'September', value: 'September', detail: 'Start of school year' },
  { label: 'Flexible', value: 'Flexible', detail: 'Keep options open' },
];

const commuteOptions: Option[] = [
  { label: 'Walk', value: 'Walk', icon: hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' }) },
  { label: 'Bike', value: 'Bike', icon: hiveSymbol({ ios: 'bicycle', android: 'pedal_bike', web: 'pedal_bike' }) },
  { label: 'Drive', value: 'Drive', icon: hiveSymbol({ ios: 'car.fill', android: 'directions_car', web: 'directions_car' }) },
  { label: 'Transit', value: 'Transit', icon: hiveSymbol({ ios: 'bus.fill', android: 'directions_bus', web: 'directions_bus' }) },
];

const commuteMaxOptions: Option[] = [
  { label: '10 min', value: '10 min' },
  { label: '15 min', value: '15 min' },
  { label: '20 min', value: '20 min' },
  { label: 'Flexible', value: 'Flexible' },
];

const listingTypeOptions: Option[] = [
  { label: 'Apartment', value: 'Apartment' },
  { label: 'Studio', value: 'Studio' },
  { label: 'Private room', value: 'Private room' },
  { label: 'Shared room', value: 'Shared room' },
  { label: 'Flexible', value: 'Flexible' },
];

const bedroomOptions: Option[] = [
  { label: 'Studio', value: 'Studio' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4+', value: '4+' },
  { label: 'Flexible', value: 'Flexible' },
];

const bathroomOptions: Option[] = [
  { label: '1+', value: '1+' },
  { label: '2+', value: '2+' },
  { label: 'Flexible', value: 'Flexible' },
];

const parkingOptions: Option[] = [
  { label: 'Needed', value: 'Needed', detail: 'Only listings with parking' },
  { label: 'Nice to have', value: 'Nice to have', detail: 'Boost, don\'t filter' },
  { label: 'No preference', value: 'No preference', detail: 'Ignore parking' },
];

const initialState: OnboardingState = {
  username: 'Rey',
  campus: 'UCLA',
  groupCode: '',
  groupMode: null,
  rent: '$2,500',
  moveIn: 'August',
  commuteMode: 'Walk',
  commuteMax: '20 min',
  listingType: 'Apartment',
  bedrooms: '2',
  bathrooms: '1+',
  parking: 'Nice to have',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const theme = useTheme();
  const [state, setState] = useState<OnboardingState>(initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [fade] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.Value(0));
  const step = steps[stepIndex];
  const progress = (stepIndex + 1) / steps.length;
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

  const goNext = () => {
    if (!canContinue) return;
    if (stepIndex === steps.length - 1) {
      router.replace('/discover');
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
    <Screen contentStyle={styles.screen}>
      <View style={styles.top}>
        <IconButton
          icon={hiveSymbol({ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' })}
          label="Back"
          size="sm"
          onPress={goBack}
        />
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
        </View>
        <ThemedText type="caption" themeColor="textTertiary">
          {stepIndex + 1}/{steps.length}
        </ThemedText>
      </View>

      <View style={styles.headerCopy}>
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

      <PrimaryAction disabled={!canContinue} onPress={goNext}>
        {stepIndex === steps.length - 1 ? 'Start swiping' : 'Continue'}
      </PrimaryAction>
    </Screen>
  );
}

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
            placeholder="HIVE-204"
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
        <View style={styles.stage}>
          <OptionGrid
            options={rentOptions}
            value={state.rent}
            onChange={(value) => update('rent', value)}
          />
        </View>
      );
    case 'moveIn':
      return (
        <View style={styles.stage}>
          <OptionGrid
            options={moveInOptions}
            value={state.moveIn}
            onChange={(value) => update('moveIn', value)}
          />
        </View>
      );
    case 'commute':
      return (
        <View style={styles.stage}>
          <OptionGrid
            options={commuteOptions}
            value={state.commuteMode}
            onChange={(value) => update('commuteMode', value)}
          />
          <View style={styles.subsection}>
            <ThemedText type="label" themeColor="textTertiary">
              Max commute
            </ThemedText>
            <OptionGrid
              options={commuteMaxOptions}
              value={state.commuteMax}
              onChange={(value) => update('commuteMax', value)}
              compact
            />
          </View>
        </View>
      );
    case 'room':
      return (
        <View style={styles.stage}>
          <View style={styles.subsection}>
            <ThemedText type="label" themeColor="textTertiary">
              Listing type
            </ThemedText>
            <OptionGrid
              options={listingTypeOptions}
              value={state.listingType}
              onChange={(value) => update('listingType', value)}
              compact
            />
          </View>
          <View style={styles.split}>
            <View style={styles.splitColumn}>
              <ThemedText type="label" themeColor="textTertiary">
                Bedrooms
              </ThemedText>
              <OptionGrid
                options={bedroomOptions}
                value={state.bedrooms}
                onChange={(value) => update('bedrooms', value)}
                compact
              />
            </View>
            <View style={styles.splitColumn}>
              <ThemedText type="label" themeColor="textTertiary">
                Bathrooms
              </ThemedText>
              <OptionGrid
                options={bathroomOptions}
                value={state.bathrooms}
                onChange={(value) => update('bathrooms', value)}
                compact
              />
            </View>
          </View>
          <View style={styles.subsection}>
            <ThemedText type="label" themeColor="textTertiary">
              Parking
            </ThemedText>
            <View style={styles.optionStack}>
              {parkingOptions.map((option) => (
                <OptionRow
                  key={option.value}
                  label={option.label}
                  detail={option.detail}
                  selected={state.parking === option.value}
                  onPress={() => update('parking', option.value)}
                  icon={hiveSymbol({ ios: 'parkingsign.circle.fill', android: 'local_parking', web: 'local_parking' })}
                />
              ))}
            </View>
          </View>
        </View>
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

function OptionGrid({
  options,
  value,
  onChange,
  compact,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.optionGrid, compact && styles.optionGridCompact]}>
      {options.map((option) => (
        <OptionRow
          key={option.value}
          label={option.label}
          detail={option.detail}
          icon={option.icon}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
          compact={compact}
        />
      ))}
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
        <ReviewItem label="Rent" value={state.rent} />
        <ReviewItem label="Move-in" value={state.moveIn} />
        <ReviewItem label="Commute" value={`${state.commuteMode}, ${state.commuteMax}`} />
        <ReviewItem label="Room" value={`${state.listingType}, ${state.bedrooms} bed, ${state.bathrooms} bath`} />
        <ReviewItem label="Parking" value={state.parking} />
      </View>
    </View>
  );
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
  screen: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  top: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  body: {
    gap: Spacing.four,
  },
  headerCopy: {
    gap: Spacing.one,
  },
  title: {
    maxWidth: 390,
    fontSize: 34,
    lineHeight: 39,
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
  subsection: {
    gap: Spacing.two,
  },
  split: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  splitColumn: {
    flex: 1,
    gap: Spacing.two,
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
  optionGrid: {
    gap: Spacing.two,
  },
  optionGridCompact: {
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
