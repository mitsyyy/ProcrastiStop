import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { FontFamilies, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import {
  ExactTimeSelector,
  formatHHmm,
  formatTime12HourLabel,
  parseHHmm,
} from './TimeOfDayPicker';

interface DeadlineSplitPickerProps {
  dateKey: string | null; // "YYYY-MM-DD" or null
  timeHHmm: string | null; // "HH:mm" or null
  onChangeDate: (nextDateKey: string) => void;
  onChangeTime: (nextHHmm: string) => void;
  dateError?: string;
  timeError?: string;
  combinedError?: string;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function combineDateKeyAndTimeToIso(
  dateKey: string | null,
  timeHHmm: string | null,
): string | null {
  if (!dateKey || !timeHHmm) return null;
  const [yRaw, mRaw, dRaw] = dateKey.split('-');
  const year = Number(yRaw);
  const month = Number(mRaw);
  const day = Number(dRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const { hour24, minute } = parseHHmm(timeHHmm);
  const combined = new Date(year, month - 1, day, hour24, minute, 0, 0);
  return Number.isNaN(combined.getTime()) ? null : combined.toISOString();
}

export function extractDateKeyAndTimeFromIso(iso: string | null): {
  dateKey: string | null;
  timeHHmm: string | null;
} {
  if (!iso) return { dateKey: null, timeHHmm: null };
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { dateKey: null, timeHHmm: null };
  return {
    dateKey: toLocalDateKey(parsed),
    timeHHmm: formatHHmm(parsed.getHours(), parsed.getMinutes()),
  };
}

function formatDateDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DeadlineSplitPicker({
  dateKey,
  timeHHmm,
  onChangeDate,
  onChangeTime,
  dateError,
  timeError,
  combinedError,
}: DeadlineSplitPickerProps) {
  const palette = useAppTheme();

  // Independent modal states: Calendar-only vs Borderless Scroll-Wheel Time-only
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);

  const [todayKey, setTodayKey] = useState<string>(() => toLocalDateKey(new Date()));
  const [draftDateKey, setDraftDateKey] = useState<string>(dateKey ?? todayKey);
  const [calendarMonthKey, setCalendarMonthKey] = useState<string>(dateKey ?? todayKey);
  const [dateModalWarn, setDateModalWarn] = useState<string | null>(null);

  const initialTime = parseHHmm(timeHHmm ?? '19:00');
  const [draftHour24, setDraftHour24] = useState(initialTime.hour24);
  const [draftMinute, setDraftMinute] = useState(initialTime.minute);
  const [timeModalWarn, setTimeModalWarn] = useState<string | null>(null);

  const openDateModal = () => {
    const nowKey = toLocalDateKey(new Date());
    setTodayKey(nowKey);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startKey = dateKey ?? toLocalDateKey(tomorrow);
    setDraftDateKey(startKey);
    setCalendarMonthKey(startKey);
    setDateModalWarn(null);
    setDateModalOpen(true);
  };

  const openTimeModal = () => {
    const parsed = parseHHmm(timeHHmm ?? '19:00');
    setDraftHour24(parsed.hour24);
    setDraftMinute(parsed.minute);
    setTimeModalWarn(null);
    setTimeModalOpen(true);
  };

  const handleSelectDay = (day: DateData) => {
    if (day.dateString < todayKey) {
      setDateModalWarn('Past dates cannot be selected. Pick today or a future date.');
      return;
    }
    setDateModalWarn(null);
    setDraftDateKey(day.dateString);
  };

  const handleQuickDateOffset = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    const key = toLocalDateKey(target);
    setDateModalWarn(null);
    setDraftDateKey(key);
    setCalendarMonthKey(key);
  };

  const handleConfirmDate = () => {
    if (draftDateKey < todayKey) {
      setDateModalWarn('Past dates cannot be selected.');
      return;
    }
    onChangeDate(draftDateKey);
    setDateModalOpen(false);
  };

  const handleConfirmTime = () => {
    const nextHHmm = formatHHmm(draftHour24, draftMinute);
    if (dateKey && dateKey === toLocalDateKey(new Date())) {
      const candidateIso = combineDateKeyAndTimeToIso(dateKey, nextHHmm);
      if (candidateIso && new Date(candidateIso).getTime() <= Date.now()) {
        setTimeModalWarn('That time has already passed today. Choose a future time.');
        return;
      }
    }
    onChangeTime(nextHHmm);
    setTimeModalOpen(false);
  };

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: 'transparent',
      calendarBackground: 'transparent',
      textSectionTitleColor: palette.textMuted,
      monthTextColor: palette.text,
      arrowColor: palette.accentMint,
      dayTextColor: palette.text,
      todayTextColor: palette.accentMint,
      textDisabledColor: palette.placeholder,
      textMonthFontFamily: FontFamilies.bold,
      textMonthFontSize: 16,
      textDayHeaderFontFamily: FontFamilies.semiBold,
      textDayHeaderFontSize: 12,
      textDayFontFamily: FontFamilies.medium,
      textDayFontSize: 14,
    }),
    [palette],
  );

  return (
    <View style={styles.root}>
      <View style={styles.splitRow}>
        {/* Dedicated Deadline Date Input */}
        <View style={styles.col}>
          <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
            Deadline Date (required)
          </Text>
          <Pressable
            onPress={openDateModal}
            accessibilityRole="button"
            accessibilityLabel="Select deadline date"
            style={[
              styles.inputBox,
              {
                backgroundColor: palette.surfaceGlass,
                borderColor: dateError || combinedError ? palette.danger : palette.border,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                Typography.body,
                styles.inputText,
                { color: dateKey ? palette.text : palette.placeholder },
              ]}
            >
              {dateKey ? formatDateDisplay(dateKey) : 'Select date...'}
            </Text>
            <AppIcon
              name="calendar"
              size={17}
              color={dateError || combinedError ? palette.dangerText : palette.accentMint}
            />
          </Pressable>
          {dateError ? (
            <Text style={[Typography.small, { color: palette.dangerText }]}>{dateError}</Text>
          ) : null}
        </View>

        {/* Dedicated Deadline Time Input */}
        <View style={styles.col}>
          <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
            Deadline Time (required)
          </Text>
          <Pressable
            onPress={openTimeModal}
            accessibilityRole="button"
            accessibilityLabel="Select deadline time"
            style={[
              styles.inputBox,
              {
                backgroundColor: palette.surfaceGlass,
                borderColor: timeError || combinedError ? palette.danger : palette.border,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                Typography.body,
                styles.inputText,
                { color: timeHHmm ? palette.text : palette.placeholder },
              ]}
            >
              {timeHHmm ? formatTime12HourLabel(timeHHmm) : 'Select time...'}
            </Text>
            <AppIcon
              name="clock"
              size={17}
              color={timeError || combinedError ? palette.dangerText : palette.accentMint}
            />
          </Pressable>
          {timeError ? (
            <Text style={[Typography.small, { color: palette.dangerText }]}>{timeError}</Text>
          ) : null}
        </View>
      </View>

      {combinedError ? (
        <Text style={[Typography.small, { color: palette.dangerText }]}>{combinedError}</Text>
      ) : null}

      {/* Modal 1: Calendar-Only Picker (Single Clean Cancel / Confirm Pair) */}
      <Modal
        visible={dateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setDateModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[Typography.h3, { color: palette.text }]}>Deadline Date</Text>
              <Pressable onPress={() => setDateModalOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <View style={styles.quickRow}>
              {[
                { label: 'Tomorrow', offset: 1 },
                { label: '+2 days', offset: 2 },
                { label: '+3 days', offset: 3 },
                { label: '+1 week', offset: 7 },
              ].map((preset) => (
                <Pressable
                  key={preset.label}
                  onPress={() => handleQuickDateOffset(preset.offset)}
                  style={[
                    styles.quickChip,
                    { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                  ]}
                >
                  <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {dateModalWarn ? (
              <Text style={[Typography.small, { color: palette.dangerText }]}>{dateModalWarn}</Text>
            ) : null}

            <View
              style={[
                styles.calendarCard,
                { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
              ]}
            >
              <Calendar
                key={calendarMonthKey.slice(0, 7)}
                current={calendarMonthKey}
                minDate={todayKey}
                enableSwipeMonths
                theme={calendarTheme}
                onMonthChange={(m) => setCalendarMonthKey(m.dateString)}
                renderArrow={(direction) => (
                  <View style={styles.chevronHit}>
                    <AppIcon
                      name={direction === 'left' ? 'arrow' : 'chevron'}
                      size={18}
                      color={palette.accentMint}
                      strokeWidth={2.2}
                    />
                  </View>
                )}
                dayComponent={({ date, state }) => {
                  if (!date) return <View style={styles.dayCellWrapper} />;
                  const isSelected = date.dateString === draftDateKey;
                  const isToday = date.dateString === todayKey;
                  const isPastDay = date.dateString < todayKey;
                  const isOutside = state === 'disabled' || isPastDay;

                  return (
                    <View style={styles.dayCellWrapper}>
                      <Pressable
                        disabled={isPastDay}
                        onPress={() => handleSelectDay(date)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected, disabled: isPastDay }}
                        style={[
                          styles.dayCircle,
                          isSelected && !isPastDay && { backgroundColor: palette.primary },
                          !isSelected &&
                            isToday && {
                              borderWidth: 1.5,
                              borderColor: palette.accentMint,
                            },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.caption,
                            styles.dayText,
                            {
                              color:
                                isSelected && !isPastDay
                                  ? '#ffffff'
                                  : isToday
                                    ? palette.accentMint
                                    : isOutside
                                      ? palette.placeholder
                                      : palette.text,
                              opacity: isPastDay ? 0.35 : 1,
                              fontWeight: isSelected || isToday ? '700' : '500',
                            },
                          ]}
                        >
                          {date.day}
                        </Text>
                      </Pressable>
                    </View>
                  );
                }}
              />
            </View>

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                compact
                onPress={() => setDateModalOpen(false)}
                style={styles.flexOne}
              />
              <PrimaryButton
                title="Confirm"
                compact
                fullWidth={false}
                onPress={handleConfirmDate}
                style={styles.flexOne}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal 2: Borderless Infinite-Loop Time Wheel (Single Clean Cancel / Confirm Pair) */}
      <Modal
        visible={timeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setTimeModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[Typography.h3, { color: palette.text }]}>Deadline Time</Text>
              <Pressable onPress={() => setTimeModalOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            {timeModalWarn ? (
              <Text style={[Typography.small, { color: palette.dangerText }]}>{timeModalWarn}</Text>
            ) : null}

            <ExactTimeSelector
              hour24={draftHour24}
              minute={draftMinute}
              onChangeTime={(h, m) => {
                setTimeModalWarn(null);
                setDraftHour24(h);
                setDraftMinute(m);
              }}
            />

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                compact
                onPress={() => setTimeModalOpen(false)}
                style={styles.flexOne}
              />
              <PrimaryButton
                title="Confirm"
                compact
                fullWidth={false}
                onPress={handleConfirmTime}
                style={styles.flexOne}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  splitRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  inputBox: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  inputText: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    flexWrap: 'wrap',
  },
  quickChip: {
    flexGrow: 1,
    minWidth: 64,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  calendarCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  chevronHit: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellWrapper: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    aspectRatio: 1,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  flexOne: {
    flex: 1,
  },
});
