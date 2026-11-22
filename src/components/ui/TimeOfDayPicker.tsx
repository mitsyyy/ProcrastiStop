import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const ALL_MINUTES = Array.from({ length: 60 }, (_, idx) => idx);
const PERIODS = ['AM', 'PM'] as const;

const WHEEL_ITEM_HEIGHT = 46;
const WHEEL_VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;

export function to12HourParts(hour24: number, minute: number): {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
} {
  const safeHour = ((hour24 % 24) + 24) % 24;
  const period: 'AM' | 'PM' = safeHour >= 12 ? 'PM' : 'AM';
  const raw12 = safeHour % 12;
  return {
    hour12: raw12 === 0 ? 12 : raw12,
    minute: Math.min(59, Math.max(0, minute)),
    period,
  };
}

export function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
  const normalized = Math.min(12, Math.max(1, hour12));
  if (period === 'AM') return normalized === 12 ? 0 : normalized;
  return normalized === 12 ? 12 : normalized + 12;
}

export function parseHHmm(hhmm: string): { hour24: number; minute: number } {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  return {
    hour24: Number.isFinite(h) ? Math.min(23, Math.max(0, Math.floor(h))) : 19,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, Math.floor(m))) : 0,
  };
}

export function formatHHmm(hour24: number, minute: number): string {
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTime12HourLabel(hhmm: string): string {
  const { hour24, minute } = parseHHmm(hhmm);
  const { hour12, period } = to12HourParts(hour24, minute);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

interface WheelColumnProps<T extends string | number> {
  items: readonly T[];
  selectedIndex: number;
  formatItem: (item: T) => string;
  onSelectIndex: (nextIndex: number) => void;
  accessibilityLabel: string;
  loop?: boolean;
  accentSelected?: boolean;
}

function WheelColumn<T extends string | number>({
  items,
  selectedIndex,
  formatItem,
  onSelectIndex,
  accessibilityLabel,
  loop = false,
  accentSelected = false,
}: WheelColumnProps<T>) {
  const palette = useAppTheme();
  const baseLen = items.length;
  const loopCycles = loop ? (baseLen <= 12 ? 40 : 20) : 1;
  const midCycle = loop ? Math.floor(loopCycles / 2) : 0;

  const virtualData = useMemo(() => {
    if (!loop) return [...items];
    const repeated: T[] = [];
    for (let c = 0; c < loopCycles; c++) {
      for (let i = 0; i < baseLen; i++) {
        repeated.push(items[i]);
      }
    }
    return repeated;
  }, [items, loop, loopCycles, baseLen]);

  const initialVirtualIndex = midCycle * baseLen + selectedIndex;
  const listRef = useRef<FlatList<T>>(null);
  const isMomentumRef = useRef(false);
  const currentVirtualIndexRef = useRef(initialVirtualIndex);
  const lastCommittedBaseIndexRef = useRef(selectedIndex);

  useEffect(() => {
    if (selectedIndex !== lastCommittedBaseIndexRef.current) {
      lastCommittedBaseIndexRef.current = selectedIndex;
      const targetVirtual = midCycle * baseLen + selectedIndex;
      currentVirtualIndexRef.current = targetVirtual;
      listRef.current?.scrollToOffset({
        offset: targetVirtual * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex, midCycle, baseLen]);

  const commitOffset = useCallback(
    (offsetY: number, recenterIfEdge: boolean) => {
      const total = virtualData.length;
      const rawVirtual = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
      const clampedVirtual = Math.min(total - 1, Math.max(0, rawVirtual));
      const baseIdx = ((clampedVirtual % baseLen) + baseLen) % baseLen;

      currentVirtualIndexRef.current = clampedVirtual;

      if (baseIdx !== lastCommittedBaseIndexRef.current) {
        lastCommittedBaseIndexRef.current = baseIdx;
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
        onSelectIndex(baseIdx);
      }

      // Silently recenter into the middle cycle if user scrolled near either virtual boundary
      if (loop && recenterIfEdge) {
        const minSafe = baseLen * 3;
        const maxSafe = total - baseLen * 3;
        if (clampedVirtual < minSafe || clampedVirtual > maxSafe) {
          const recentered = midCycle * baseLen + baseIdx;
          currentVirtualIndexRef.current = recentered;
          listRef.current?.scrollToOffset({
            offset: recentered * WHEEL_ITEM_HEIGHT,
            animated: false,
          });
        }
      }
    },
    [virtualData.length, baseLen, loop, midCycle, onSelectIndex],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isMomentumRef.current = false;
      commitOffset(e.nativeEvent.contentOffset.y, true);
    },
    [commitOffset],
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setTimeout(() => {
        if (!isMomentumRef.current) {
          commitOffset(y, true);
        }
      }, 65);
    },
    [commitOffset],
  );

  const handlePressVirtualIndex = useCallback(
    (virtualIdx: number) => {
      const baseIdx = ((virtualIdx % baseLen) + baseLen) % baseLen;
      currentVirtualIndexRef.current = virtualIdx;
      lastCommittedBaseIndexRef.current = baseIdx;
      listRef.current?.scrollToOffset({
        offset: virtualIdx * WHEEL_ITEM_HEIGHT,
        animated: true,
      });
      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync();
      }
      onSelectIndex(baseIdx);
    },
    [baseLen, onSelectIndex],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<T> | null | undefined, index: number) => ({
      length: WHEEL_ITEM_HEIGHT,
      offset: WHEEL_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.wheelCol} accessibilityLabel={accessibilityLabel}>
      <FlatList
        ref={listRef}
        data={virtualData}
        keyExtractor={(_item, idx) => `${idx}`}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={initialVirtualIndex}
        getItemLayout={getItemLayout}
        windowSize={5}
        initialNumToRender={7}
        maxToRenderPerBatch={12}
        contentContainerStyle={styles.wheelListContent}
        onMomentumScrollBegin={() => {
          isMomentumRef.current = true;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEndDrag}
        renderItem={({ item, index }) => {
          const baseIdx = ((index % baseLen) + baseLen) % baseLen;
          const isSelected = baseIdx === selectedIndex;
          return (
            <Pressable
              onPress={() => handlePressVirtualIndex(index)}
              style={styles.wheelItem}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  isSelected ? styles.activeWheelText : styles.inactiveWheelText,
                  {
                    color: isSelected
                      ? accentSelected
                        ? palette.accentMint
                        : palette.text
                      : palette.textMuted,
                    opacity: isSelected ? 1 : 0.36,
                  },
                ]}
              >
                {formatItem(item)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

interface ExactTimeSelectorProps {
  hour24: number;
  minute: number;
  onChangeTime: (nextHour24: number, nextMinute: number) => void;
}

export function ExactTimeSelector({
  hour24,
  minute,
  onChangeTime,
}: ExactTimeSelectorProps) {
  const palette = useAppTheme();
  const { hour12, period } = to12HourParts(hour24, minute);

  const hourIndex = HOURS_12.indexOf(hour12 as (typeof HOURS_12)[number]);
  const minuteIndex = Math.min(59, Math.max(0, minute));
  const periodIndex = period === 'PM' ? 1 : 0;

  const handleSelectHourIndex = useCallback(
    (idx: number) => {
      const nextHour12 = HOURS_12[idx] ?? 12;
      onChangeTime(to24Hour(nextHour12, period), minute);
    },
    [minute, onChangeTime, period],
  );

  const handleSelectMinuteIndex = useCallback(
    (idx: number) => {
      onChangeTime(hour24, ALL_MINUTES[idx] ?? 0);
    },
    [hour24, onChangeTime],
  );

  const handleSelectPeriodIndex = useCallback(
    (idx: number) => {
      const nextPeriod = PERIODS[idx] ?? 'PM';
      onChangeTime(to24Hour(hour12, nextPeriod), minute);
    },
    [hour12, minute, onChangeTime],
  );

  return (
    <View style={styles.wheelSection}>
      <View style={styles.wheelHeaderRow}>
        <Text style={[Typography.small, styles.wheelHeaderLabel, { color: palette.textMuted }]}>
          Hour
        </Text>
        <Text style={[Typography.small, styles.wheelHeaderLabel, { color: palette.textMuted }]}>
          Min
        </Text>
        <Text style={[Typography.small, styles.wheelHeaderLabel, { color: palette.textMuted }]}>
          AM / PM
        </Text>
      </View>

      {/* Borderless floating 3-column wheel directly on modal surface */}
      <View style={styles.wheelFloatingArea}>
        <View pointerEvents="none" style={styles.colonOverlay}>
          <Text style={[styles.colonText, { color: palette.text }]}>:</Text>
        </View>

        <View style={styles.wheelColumnsRow}>
          <WheelColumn
            items={HOURS_12}
            selectedIndex={hourIndex >= 0 ? hourIndex : 0}
            formatItem={(h) => String(h)}
            onSelectIndex={handleSelectHourIndex}
            accessibilityLabel="Select hour"
            loop
          />
          <WheelColumn
            items={ALL_MINUTES}
            selectedIndex={minuteIndex}
            formatItem={(m) => String(m).padStart(2, '0')}
            onSelectIndex={handleSelectMinuteIndex}
            accessibilityLabel="Select minute"
            loop
          />
          <WheelColumn
            items={PERIODS}
            selectedIndex={periodIndex}
            formatItem={(p) => p}
            onSelectIndex={handleSelectPeriodIndex}
            accessibilityLabel="Select AM or PM"
            accentSelected
          />
        </View>
      </View>
    </View>
  );
}

interface TimeOfDayPickerProps {
  label: string;
  helperText?: string;
  value: string;
  onChange: (nextHHmm: string) => void;
  containerStyle?: ViewStyle;
}

export function TimeOfDayPicker({
  label,
  helperText,
  value,
  onChange,
  containerStyle,
}: TimeOfDayPickerProps) {
  const palette = useAppTheme();
  const [open, setOpen] = useState(false);
  const initial = parseHHmm(value);
  const [draftHour24, setDraftHour24] = useState(initial.hour24);
  const [draftMinute, setDraftMinute] = useState(initial.minute);

  const openPicker = () => {
    const parsed = parseHHmm(value);
    setDraftHour24(parsed.hour24);
    setDraftMinute(parsed.minute);
    setOpen(true);
  };

  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
        {label}
      </Text>

      <Pressable
        onPress={openPicker}
        style={[
          styles.trigger,
          { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
        ]}
      >
        <AppIcon name="clock" size={18} color={palette.accentMint} />
        <Text style={[Typography.bodySemiBold, styles.triggerText, { color: palette.text }]}>
          {formatTime12HourLabel(value)}
        </Text>
        <AppIcon name="chevron" size={16} color={palette.textMuted} />
      </Pressable>

      {helperText ? (
        <Text style={[Typography.small, { color: palette.textMuted }]}>{helperText}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[Typography.h3, { color: palette.text }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <ExactTimeSelector
              hour24={draftHour24}
              minute={draftMinute}
              onChangeTime={(h, m) => {
                setDraftHour24(h);
                setDraftMinute(m);
              }}
            />

            <PrimaryButton
              title={`Set ${formatTime12HourLabel(formatHHmm(draftHour24, draftMinute))}`}
              onPress={() => {
                onChange(formatHHmm(draftHour24, draftMinute));
                setOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  trigger: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  triggerText: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wheelSection: {
    gap: Spacing.xs,
  },
  wheelHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
  },
  wheelHeaderLabel: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  wheelFloatingArea: {
    height: WHEEL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  colonOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
  },
  colonText: {
    position: 'absolute',
    left: '33.33%',
    marginLeft: -4,
    fontSize: 22,
    fontWeight: '700',
  },
  wheelColumnsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  wheelCol: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  wheelListContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeWheelText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  inactiveWheelText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
