import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { useRef, useState } from 'react';

import { IconGlyph, hiveSymbol } from '@/components/hive/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BUDGET_MIN = 600;
const BUDGET_MAX = 3000;
const BUDGET_STEP = 50;
const RADIUS_MIN = 0.5;
const RADIUS_MAX = 2.5;
const RADIUS_STEP = 0.25;
const HANDLE_SIZE = 34;

export type MoveInMonth = 'Aug' | 'Sep' | 'Oct' | 'Flexible';

export function BudgetRangeStage({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  return (
    <View style={[styles.stage, styles.budgetStage]}>
      <View style={styles.budgetValueRow}>
        <ThemedText
          type="display"
          style={styles.budgetValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.76}>
          {formatBudget(min)} - {formatBudget(max)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.perMonth}>
          /mo
        </ThemedText>
      </View>

      <RangeSlider
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={BUDGET_STEP}
        low={min}
        high={max}
        onChange={onChange}
      />

      <View style={styles.sliderLabels}>
        <ThemedText type="small" themeColor="textSecondary">
          $600
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          $3,000+
        </ThemedText>
      </View>
    </View>
  );
}

export function CampusRadiusStage({
  miles,
  onChange,
}: {
  miles: number;
  onChange: (miles: number) => void;
}) {
  const walkMinutes = Math.round(miles * 19);
  const bikeMinutes = Math.max(2, Math.round(miles * 6));

  return (
    <View style={styles.stage}>
      <CampusMap miles={miles} walkMinutes={walkMinutes} bikeMinutes={bikeMinutes} />

      <View style={styles.radiusReadout}>
        <View style={styles.radiusNumberRow}>
          <ThemedText type="display" style={styles.radiusValue}>
            {formatMiles(miles)}
          </ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary" style={styles.radiusUnit}>
            mi
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          ~{walkMinutes} min walk
        </ThemedText>
      </View>

      <ValueSlider
        min={RADIUS_MIN}
        max={RADIUS_MAX}
        step={RADIUS_STEP}
        value={miles}
        onChange={onChange}
      />

      <View style={styles.sliderLabels}>
        <ThemedText type="small" themeColor="textSecondary">
          On campus
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          2.5+ mi
        </ThemedText>
      </View>
    </View>
  );
}

export function HomeSetupStage({
  bedrooms,
  bathrooms,
  moveIn,
  onBedroomsChange,
  onBathroomsChange,
  onMoveInChange,
}: {
  bedrooms: number;
  bathrooms: number;
  moveIn: MoveInMonth;
  onBedroomsChange: (value: number) => void;
  onBathroomsChange: (value: number) => void;
  onMoveInChange: (value: MoveInMonth) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.stage}>
      <View style={[styles.setupPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <StepperRow
          icon={hiveSymbol({ ios: 'bed.double.fill', android: 'bed', web: 'bed' })}
          label="Bedrooms"
          value={bedrooms}
          min={0}
          max={6}
          onChange={onBedroomsChange}
          displayValue={bedrooms === 0 ? 'Studio' : String(bedrooms)}
        />
        <View style={[styles.panelDivider, { backgroundColor: theme.border }]} />
        <StepperRow
          icon={hiveSymbol({ ios: 'bathtub.fill', android: 'bathtub', web: 'bathtub' })}
          label="Bathrooms"
          value={bathrooms}
          min={1}
          max={5}
          onChange={onBathroomsChange}
        />
      </View>

      <View style={[styles.moveInPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.moveInHeader}>
          <View style={[styles.softIcon, { backgroundColor: theme.primarySoft }]}>
            <IconGlyph
              name={hiveSymbol({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' })}
              color={theme.primary}
              size={21}
            />
          </View>
          <ThemedText type="sectionTitle" style={styles.moveInTitle}>
            Move-in
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            2026
          </ThemedText>
        </View>
        <View style={styles.monthRow}>
          {(['Aug', 'Sep', 'Oct', 'Flexible'] as const).map((month) => {
            const selected = month === moveIn;

            return (
              <Pressable
                key={month}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onMoveInChange(month)}
                style={({ pressed }) => [
                  styles.monthPill,
                  {
                    backgroundColor: selected ? theme.primary : theme.primarySoft,
                    opacity: pressed ? 0.74 : 1,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.primaryText : theme.primary }}>
                  {month}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function CampusMap({
  miles,
  walkMinutes,
  bikeMinutes,
}: {
  miles: number;
  walkMinutes: number;
  bikeMinutes: number;
}) {
  const theme = useTheme();
  const radiusSize = 118 + ((miles - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 132;
  const gridLines = [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <View style={[styles.mapCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {gridLines.map((line) => (
        <View
          key={`v-${line}`}
          style={[
            styles.gridLineVertical,
            { left: `${(line / (gridLines.length - 1)) * 100}%`, backgroundColor: theme.border },
          ]}
        />
      ))}
      {gridLines.map((line) => (
        <View
          key={`h-${line}`}
          style={[
            styles.gridLineHorizontal,
            { top: `${(line / (gridLines.length - 1)) * 100}%`, backgroundColor: theme.border },
          ]}
        />
      ))}
      <View style={[styles.mapBlock, styles.mapBlockNorth, { backgroundColor: theme.successSoft }]} />
      <View style={[styles.mapBlock, styles.mapBlockEast, { backgroundColor: theme.successSoft }]} />
      <View
        style={[
          styles.radiusCircle,
          {
            width: radiusSize,
            height: radiusSize,
            borderRadius: radiusSize / 2,
            borderColor: theme.primary,
            backgroundColor: theme.backgroundSelected,
          },
        ]}
      />
      <View style={[styles.campusPill, { backgroundColor: theme.primary }]}>
        <ThemedText type="smallBold" style={{ color: theme.primaryText }}>
          UCLA
        </ThemedText>
      </View>
      <IconGlyph
        name={hiveSymbol({ ios: 'mappin', android: 'location_on', web: 'location_on' })}
        color={theme.primary}
        size={32}
      />
      <View style={styles.mapBadges}>
        <MapBadge
          icon={hiveSymbol({ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' })}
          label={`${walkMinutes} min`}
        />
        <MapBadge
          icon={hiveSymbol({ ios: 'bicycle', android: 'pedal_bike', web: 'pedal_bike' })}
          label={`${bikeMinutes} min`}
        />
      </View>
    </View>
  );
}

function MapBadge({ icon, label }: { icon: Parameters<typeof hiveSymbol>[0]; label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.mapBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <IconGlyph name={icon} color={theme.primary} size={15} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </View>
  );
}

function StepperRow({
  icon,
  label,
  value,
  min,
  max,
  displayValue,
  onChange,
}: {
  icon: Parameters<typeof hiveSymbol>[0];
  label: string;
  value: number;
  min: number;
  max: number;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.stepperRow}>
      <View style={[styles.softIcon, { backgroundColor: theme.primarySoft }]}>
        <IconGlyph name={icon} color={theme.primary} size={21} />
      </View>
      <ThemedText type="sectionTitle" style={styles.stepperLabel} numberOfLines={1} minimumFontScale={0.86}>
        {label}
      </ThemedText>
      <RoundControl
        label={`Decrease ${label.toLowerCase()}`}
        icon={hiveSymbol({ ios: 'minus', android: 'remove', web: 'remove' })}
        disabled={!canDecrease}
        onPress={() => canDecrease && onChange(value - 1)}
      />
      <ThemedText type="display" style={styles.stepperValue}>
        {displayValue ?? value}
      </ThemedText>
      <RoundControl
        label={`Increase ${label.toLowerCase()}`}
        icon={hiveSymbol({ ios: 'plus', android: 'add', web: 'add' })}
        disabled={!canIncrease}
        onPress={() => canIncrease && onChange(value + 1)}
      />
    </View>
  );
}

function RoundControl({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: Parameters<typeof hiveSymbol>[0];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundControl,
        {
          backgroundColor: disabled ? theme.backgroundElement : theme.surface,
          borderColor: theme.border,
          opacity: disabled ? 0.52 : pressed ? 0.72 : 1,
        },
      ]}>
      <IconGlyph name={icon} color={disabled ? theme.textTertiary : theme.primary} size={22} />
    </Pressable>
  );
}

function RangeSlider({
  min,
  max,
  step,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(1);
  const activeHandle = useRef<'low' | 'high'>('high');
  const lowX = valueToX(low, min, max, width);
  const highX = valueToX(high, min, max, width);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const updateHandleAtX = (handle: 'low' | 'high', x: number) => {
    const next = clamp(snap(xToValue(x, min, max, width), step), min, max);

    if (handle === 'low') {
      onChange(clamp(next, min, high - step), high);
      return;
    }

    onChange(low, clamp(next, low + step, max));
  };

  const selectHandle = (x: number) => {
    activeHandle.current = Math.abs(x - lowX) <= Math.abs(x - highX) ? 'low' : 'high';
    updateHandleAtX(activeHandle.current, x);
  };

  const handleResponderGrant = (event: GestureResponderEvent) => {
    selectHandle(event.nativeEvent.locationX);
  };

  const handleResponderMove = (event: GestureResponderEvent) => {
    updateHandleAtX(activeHandle.current, event.nativeEvent.locationX);
  };

  return (
    <View style={styles.sliderShell}>
      <View
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderTerminationRequest={() => false}
        style={styles.sliderTrackArea}>
        <View style={[styles.sliderRail, { backgroundColor: theme.backgroundSelected }]} />
        <View
          style={[
            styles.sliderActiveRail,
            {
              left: lowX,
              width: highX - lowX,
              backgroundColor: theme.primary,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.sliderHandle,
            {
              left: lowX - HANDLE_SIZE / 2,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}>
          <View style={styles.sliderHandleInner}>
            <View style={[styles.handleDot, { backgroundColor: theme.primary }]} />
          </View>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.sliderHandle,
            {
              left: highX - HANDLE_SIZE / 2,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}>
          <View style={styles.sliderHandleInner}>
            <View style={[styles.handleDot, { backgroundColor: theme.primary }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

function ValueSlider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(1);
  const x = valueToX(value, min, max, width);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const setFromX = (locationX: number) => {
    onChange(clamp(snap(xToValue(locationX, min, max, width), step), min, max));
  };

  const handleResponder = (event: GestureResponderEvent) => {
    setFromX(event.nativeEvent.locationX);
  };

  return (
    <View style={styles.sliderShell}>
      <View
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleResponder}
        onResponderMove={handleResponder}
        onResponderTerminationRequest={() => false}
        style={styles.sliderTrackArea}>
        <View style={[styles.sliderRail, { backgroundColor: theme.backgroundSelected }]} />
        <View
          style={[
            styles.sliderActiveRail,
            {
              left: 0,
              width: x,
              backgroundColor: theme.primary,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.sliderHandle,
            {
              left: x - HANDLE_SIZE / 2,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}>
          <View style={styles.sliderHandleInner}>
            <View style={[styles.handleDot, { backgroundColor: theme.primary }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

function formatBudget(value: number) {
  return `$${value.toLocaleString('en-US')}`;
}

function formatMiles(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function valueToX(value: number, min: number, max: number, width: number) {
  return ((value - min) / (max - min)) * width;
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

const styles = StyleSheet.create({
  stage: {
    gap: Spacing.four,
  },
  budgetStage: {
    minHeight: 310,
    justifyContent: 'center',
    gap: Spacing.five,
  },
  budgetValueRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  budgetValue: {
    flexShrink: 1,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 0,
    textAlign: 'center',
  },
  perMonth: {
    paddingBottom: 7,
    flexShrink: 0,
  },
  sliderShell: {
    paddingVertical: Spacing.three,
  },
  sliderTrackArea: {
    height: 56,
    justifyContent: 'center',
    marginHorizontal: HANDLE_SIZE / 2,
  },
  sliderRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 24,
    height: 8,
    borderRadius: Radius.pill,
  },
  sliderActiveRail: {
    position: 'absolute',
    top: 24,
    height: 8,
    borderRadius: Radius.pill,
  },
  sliderHandle: {
    position: 'absolute',
    top: 11,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  sliderHandleInner: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  sliderLabels: {
    marginTop: -Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapCard: {
    height: 210,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },
  mapBlock: {
    position: 'absolute',
    width: 72,
    height: 42,
    borderRadius: Radius.md,
    opacity: 0.82,
  },
  mapBlockNorth: {
    left: 38,
    top: 34,
  },
  mapBlockEast: {
    right: 40,
    bottom: 34,
  },
  radiusCircle: {
    position: 'absolute',
    opacity: 0.9,
    borderWidth: 3,
  },
  campusPill: {
    position: 'absolute',
    top: 74,
    minHeight: 34,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mapBadges: {
    position: 'absolute',
    left: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  mapBadge: {
    minHeight: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    ...Shadows.soft,
  },
  radiusReadout: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  radiusNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  radiusValue: {
    fontSize: 44,
    lineHeight: 50,
  },
  radiusUnit: {
    paddingBottom: 8,
  },
  setupPanel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three,
  },
  stepperRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  softIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    flex: 1,
    minWidth: 94,
  },
  stepperValue: {
    width: 48,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
  },
  roundControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveInPanel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  moveInHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  moveInTitle: {
    flex: 1,
  },
  monthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  monthPill: {
    minHeight: 46,
    minWidth: 74,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
