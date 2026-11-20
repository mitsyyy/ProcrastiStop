import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const ALL_MINUTES = Array.from({ length: 60 }, (_, idx) => idx);

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

  const [hourText, setHourText] = useState(String(hour12));
  const [minuteText, setMinuteText] = useState(String(minute).padStart(2, '0'));
  const [editingHour, setEditingHour] = useState(false);
  const [editingMinute, setEditingMinute] = useState(false);

  const displayedHour = editingHour ? hourText : String(hour12);
  const displayedMinute = editingMinute ? minuteText : String(minute).padStart(2, '0');

  const commitHourInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    setHourText(digits);
    const parsed = Number(digits);
    if (digits.length > 0 && parsed >= 1 && parsed <= 12) {
      onChangeTime(to24Hour(parsed, period), minute);
    }
  };

  const commitMinuteInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 2);
    setMinuteText(digits);
    const parsed = Number(digits);
    if (digits.length > 0 && parsed >= 0 && parsed <= 59) {
      onChangeTime(hour24, parsed);
    }
  };

  const selectHour = (h12: number) => {
    setEditingHour(false);
    setHourText(String(h12));
    onChangeTime(to24Hour(h12, period), minute);
  };

  const selectMinute = (min: number) => {
    setEditingMinute(false);
    setMinuteText(String(min).padStart(2, '0'));
    onChangeTime(hour24, min);
  };

  const selectPeriod = (nextPeriod: 'AM' | 'PM') => {
    onChangeTime(to24Hour(hour12, nextPeriod), minute);
  };

  return (
    <View style={styles.selectorWrap}>
      <View style={styles.directRow}>
        <View style={styles.timeInputGroup}>
          <TextInput
            value={displayedHour}
            onFocus={() => {
              setEditingHour(true);
              setHourText(String(hour12));
            }}
            onBlur={() => setEditingHour(false)}
            onChangeText={commitHourInput}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel="Hour"
            style={[
              Typography.h2,
              styles.timeInputBox,
              {
                color: palette.text,
                backgroundColor: palette.surfaceGlass,
                borderColor: editingHour ? palette.accentMint : palette.border,
              },
            ]}
          />
          <Text style={[Typography.h2, { color: palette.textMuted }]}>:</Text>
          <TextInput
            value={displayedMinute}
            onFocus={() => {
              setEditingMinute(true);
              setMinuteText(String(minute).padStart(2, '0'));
            }}
            onBlur={() => setEditingMinute(false)}
            onChangeText={commitMinuteInput}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel="Minute"
            style={[
              Typography.h2,
              styles.timeInputBox,
              {
                color: palette.text,
                backgroundColor: palette.surfaceGlass,
                borderColor: editingMinute ? palette.accentMint : palette.border,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.periodToggle,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
          ]}
        >
          {(['AM', 'PM'] as const).map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => selectPeriod(p)}
                style={[
                  styles.periodBtn,
                  active && { backgroundColor: palette.primary },
                ]}
              >
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: active ? '#ffffff' : palette.textMuted,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.stripBlock}>
        <Text style={[Typography.small, { color: palette.textMuted }]}>Hour</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {HOURS_12.map((h) => {
            const active = hour12 === h;
            return (
              <Pressable
                key={h}
                onPress={() => selectHour(h)}
                style={[
                  styles.numChip,
                  {
                    backgroundColor: active ? palette.sageTint : palette.surfaceGlass,
                    borderColor: active ? palette.accentMint : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: active ? palette.accentMint : palette.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {h}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.stripBlock}>
        <Text style={[Typography.small, { color: palette.textMuted }]}>
          Minute (exact 00–59)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {ALL_MINUTES.map((m) => {
            const active = minute === m;
            return (
              <Pressable
                key={m}
                onPress={() => selectMinute(m)}
                style={[
                  styles.numChip,
                  {
                    backgroundColor: active ? palette.sageTint : palette.surfaceGlass,
                    borderColor: active ? palette.accentMint : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: active ? palette.accentMint : palette.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {String(m).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorWrap: {
    gap: Spacing.md,
  },
  directRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeInputBox: {
    width: 64,
    height: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    textAlign: 'center',
    paddingVertical: 0,
  },
  periodToggle: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  periodBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripBlock: {
    gap: 6,
  },
  chipRow: {
    gap: 6,
    paddingVertical: 2,
  },
  numChip: {
    minWidth: 40,
    height: 36,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
