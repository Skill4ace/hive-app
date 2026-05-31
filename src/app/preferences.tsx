import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { AppSection, AppTopBar, SurfacePanel } from '@/components/hive/app-shell';
import { Button, IconButton, PreferenceChip, Screen, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useHiveAppState,
  type CommuteMode,
  type MoveInPreference,
  type ParkingPreference,
  type SearchPreferences,
} from '@/lib/hive-state';

const BUDGET_MIN = 600;
const BUDGET_MAX = 3000;
const BUDGET_STEP = 50;
const DISTANCE_MIN = 0.5;
const DISTANCE_MAX = 2.5;
const DISTANCE_STEP = 0.25;
const SLIDER_HANDLE_SIZE = 28;

const moveOptions: { label: string; value: MoveInPreference }[] = [
  { label: 'August', value: 'Aug' },
  { label: 'September', value: 'Sep' },
  { label: 'October', value: 'Oct' },
  { label: 'Flexible', value: 'Flexible' },
];
const commuteOptions: { label: string; value: CommuteMode }[] = [
  { label: 'Walk', value: 'walk' },
  { label: 'Bike', value: 'bike' },
  { label: 'Drive', value: 'drive' },
  { label: 'Transit', value: 'transit' },
];
const bedroomOptions = [0, 1, 2, 3, 4, 5];
const bathOptions = [1, 2, 3, 4, 5];
const parkingOptions: { label: string; value: ParkingPreference }[] = [
  { label: 'Needed', value: 'needed' },
  { label: 'Nice to have', value: 'nice' },
  { label: 'No preference', value: 'none' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const { preferences, updatePreferences } = useHiveAppState();
  const [draft, setDraft] = useState<SearchPreferences>(preferences);
  const section = params.section === 'search' || params.section === 'room' ? params.section : 'all';
  const showSearch = section !== 'room';
  const showRoom = section !== 'search';
  const title = section === 'search' ? 'Your filters' : section === 'room' ? 'Listing shape' : 'Preferences';

  const save = () => {
    updatePreferences(draft);
    router.back();
  };

  return (
    <Screen contentStyle={styles.screen}>
      <AppTopBar
        title={title}
        right={
          <IconButton
            icon={hiveSymbol({ ios: 'xmark', android: 'close', web: 'close' })}
            label="Close"
            onPress={() => router.back()}
          />
        }
      />

      {showSearch ? (
        <>
          <AppSection title="Campus">
            <SurfacePanel>
              <ThemedText type="sectionTitle">{draft.campusName}</ThemedText>
            </SurfacePanel>
          </AppSection>

          <AppSection title="Rent">
            <SurfacePanel>
              <View style={styles.rangeHeader}>
                <ValueBox label="Min" value={formatCurrency(draft.budgetMin)} />
                <ValueBox label="Max" value={formatCurrency(draft.budgetMax, draft.budgetMax === 3000)} />
              </View>
              <MiniRangeSlider
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                low={draft.budgetMin}
                high={draft.budgetMax}
                minLabel="$600"
                maxLabel="$3,000+"
                onChange={(budgetMin, budgetMax) => setDraft((current) => ({ ...current, budgetMin, budgetMax }))}
              />
            </SurfacePanel>
          </AppSection>

          <AppSection title="Move-in">
            <SurfacePanel>
              <View style={styles.evenGrid}>
                {moveOptions.map((option) => (
                  <ChoiceBox
                    key={option.value}
                    label={option.label}
                    even
                    selected={draft.moveIn === option.value}
                    onPress={() => setDraft((current) => ({ ...current, moveIn: option.value }))}
                  />
                ))}
              </View>
            </SurfacePanel>
          </AppSection>

          <AppSection title="Commute">
            <SurfacePanel>
              <View style={styles.subgroup}>
                <ThemedText type="label" themeColor="textTertiary">
                  Mode
                </ThemedText>
                <View style={styles.chips}>
                  {commuteOptions.map((option) => (
                    <PreferenceChip
                      key={option.value}
                      label={option.label}
                      selected={draft.commuteMode === option.value}
                      onPress={() => setDraft((current) => ({ ...current, commuteMode: option.value }))}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.subgroup}>
                <View style={styles.rangeHeader}>
                  <ValueBox label="Radius" value={`${formatDistance(draft.distanceMiles)} mi`} />
                  <ValueBox label="Walk" value={`~${Math.round(draft.distanceMiles * 19)} min`} />
                </View>
                <MiniValueSlider
                  min={DISTANCE_MIN}
                  max={DISTANCE_MAX}
                  step={DISTANCE_STEP}
                  value={draft.distanceMiles}
                  minLabel="On campus"
                  maxLabel="2.5+ mi"
                  onChange={(distanceMiles) => setDraft((current) => ({ ...current, distanceMiles }))}
                />
              </View>
            </SurfacePanel>
          </AppSection>
        </>
      ) : null}

      {showRoom ? (
        <AppSection title="Room setup">
          <SurfacePanel>
            <View style={styles.subgroup}>
              <ThemedText type="label" themeColor="textTertiary">
                Bedrooms
              </ThemedText>
              <View style={styles.boxGrid}>
                {bedroomOptions.map((option) => (
                  <ChoiceBox
                    key={option}
                    label={option === 0 ? 'Studio' : option === 5 ? '5+' : String(option)}
                    selected={draft.bedrooms === option}
                    onPress={() => setDraft((current) => ({ ...current, bedrooms: option }))}
                  />
                ))}
              </View>
            </View>
            <View style={styles.subgroup}>
              <ThemedText type="label" themeColor="textTertiary">
                Bathrooms
              </ThemedText>
              <View style={styles.boxGrid}>
                {bathOptions.map((option) => (
                  <ChoiceBox
                    key={option}
                    label={option === 5 ? '5+' : `${option}+`}
                    selected={draft.bathrooms === option}
                    onPress={() => setDraft((current) => ({ ...current, bathrooms: option }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.subgroup}>
              <ThemedText type="label" themeColor="textTertiary">
                Parking
              </ThemedText>
              <View style={styles.chips}>
                {parkingOptions.map((option) => (
                  <PreferenceChip
                    key={option.value}
                    label={option.label}
                    selected={draft.parking === option.value}
                    onPress={() => setDraft((current) => ({ ...current, parking: option.value }))}
                  />
                ))}
              </View>
            </View>
          </SurfacePanel>
        </AppSection>
      ) : null}

      <Button fullWidth onPress={save}>
        Save preferences
      </Button>
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
  subgroup: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  evenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rangeHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  valueBox: {
    flex: 1,
    minHeight: 64,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: 2,
  },
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choiceBox: {
    minHeight: 48,
    minWidth: 82,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    justifyContent: 'center',
    gap: 1,
  },
  choiceBoxEven: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
  },
  miniSlider: {
    gap: Spacing.one,
  },
  miniTrackArea: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: SLIDER_HANDLE_SIZE / 2,
  },
  miniRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    height: 7,
    borderRadius: Radius.pill,
  },
  miniActiveRail: {
    position: 'absolute',
    top: 18,
    height: 7,
    borderRadius: Radius.pill,
  },
  miniHandle: {
    position: 'absolute',
    top: 8,
    width: SLIDER_HANDLE_SIZE,
    height: SLIDER_HANDLE_SIZE,
    borderRadius: SLIDER_HANDLE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniHandleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniSliderLabels: {
    marginTop: -Spacing.one,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function ValueBox({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.valueBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="label" themeColor="textTertiary">
        {label}
      </ThemedText>
      <ThemedText type="sectionTitle">{value}</ThemedText>
    </View>
  );
}

function ChoiceBox({
  label,
  sublabel,
  selected,
  even,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected?: boolean;
  even?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceBox,
        even && styles.choiceBoxEven,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.74 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.primaryText : theme.text }}>
        {label}
      </ThemedText>
      {sublabel ? (
        <ThemedText type="caption" style={{ color: selected ? theme.primaryText : theme.textSecondary }}>
          {sublabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function MiniRangeSlider({
  min,
  max,
  step,
  low,
  high,
  minLabel,
  maxLabel,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  minLabel: string;
  maxLabel: string;
  onChange: (low: number, high: number) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(1);
  const activeHandle = useRef<'low' | 'high'>('high');
  const lowX = valueToX(low, min, max, width);
  const highX = valueToX(high, min, max, width);

  const updateAtX = (handle: 'low' | 'high', x: number) => {
    const next = clamp(snap(xToValue(x, min, max, width), step), min, max);

    if (handle === 'low') {
      onChange(clamp(next, min, high - step), high);
      return;
    }

    onChange(low, clamp(next, low + step, max));
  };

  const selectHandle = (x: number) => {
    activeHandle.current = Math.abs(x - lowX) <= Math.abs(x - highX) ? 'low' : 'high';
    updateAtX(activeHandle.current, x);
  };

  const handleResponderGrant = (event: GestureResponderEvent) => {
    selectHandle(event.nativeEvent.locationX);
  };

  const handleResponderMove = (event: GestureResponderEvent) => {
    updateAtX(activeHandle.current, event.nativeEvent.locationX);
  };

  return (
    <View style={styles.miniSlider}>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderTerminationRequest={() => false}
        style={styles.miniTrackArea}>
        <View style={[styles.miniRail, { backgroundColor: theme.backgroundSelected }]} />
        <View
          style={[
            styles.miniActiveRail,
            {
              left: lowX,
              width: highX - lowX,
              backgroundColor: theme.primary,
            },
          ]}
        />
        <MiniHandle x={lowX} />
        <MiniHandle x={highX} />
      </View>
      <View style={styles.miniSliderLabels}>
        <ThemedText type="caption" themeColor="textSecondary">
          {minLabel}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {maxLabel}
        </ThemedText>
      </View>
    </View>
  );
}

function MiniValueSlider({
  min,
  max,
  step,
  value,
  minLabel,
  maxLabel,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(1);
  const x = valueToX(value, min, max, width);

  const updateAtX = (nextX: number) => {
    onChange(clamp(snap(xToValue(nextX, min, max, width), step), min, max));
  };

  const handleResponder = (event: GestureResponderEvent) => {
    updateAtX(event.nativeEvent.locationX);
  };

  return (
    <View style={styles.miniSlider}>
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleResponder}
        onResponderMove={handleResponder}
        onResponderTerminationRequest={() => false}
        style={styles.miniTrackArea}>
        <View style={[styles.miniRail, { backgroundColor: theme.backgroundSelected }]} />
        <View style={[styles.miniActiveRail, { left: 0, width: x, backgroundColor: theme.primary }]} />
        <MiniHandle x={x} />
      </View>
      <View style={styles.miniSliderLabels}>
        <ThemedText type="caption" themeColor="textSecondary">
          {minLabel}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {maxLabel}
        </ThemedText>
      </View>
    </View>
  );
}

function MiniHandle({ x }: { x: number }) {
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        styles.miniHandle,
        {
          left: x - SLIDER_HANDLE_SIZE / 2,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}>
      <View style={[styles.miniHandleDot, { backgroundColor: theme.primary }]} />
    </View>
  );
}

function formatCurrency(value: number, plus = false) {
  return `$${value.toLocaleString('en-US')}${plus ? '+' : ''}`;
}

function formatDistance(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');
}

function valueToX(value: number, min: number, max: number, width: number) {
  return ((clamp(value, min, max) - min) / (max - min)) * width;
}

function xToValue(x: number, min: number, max: number, width: number) {
  return min + (clamp(x, 0, width) / width) * (max - min);
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
