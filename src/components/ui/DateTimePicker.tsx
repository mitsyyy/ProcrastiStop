import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { FontFamilies, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatFullDateTime } from '@/utils/date';
import { AppIcon } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { ExactTimeSelector } from './TimeOfDayPicker';

interface DateTimePickerProps {
  label: string;
  value: string | null;
  onChange: (isoOrNull: string | null) => void;
  required?: boolean;
  disallowPast?: boolean;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

function getDefaultDraftDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 0, 0, 0);
  return date;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  required = false,
  disallowPast = true,
  placeholder = 'Select deadline date & time',
  error,
  containerStyle,
}: DateTimePickerProps) {
  const palette = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() =>
    value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : getDefaultDraftDate(),
  );
  const [calendarMonthKey, setCalendarMonthKey] = useState<string>(() => toDateKey(draftDate));
  const [modalNowMs, setModalNowMs] = useState<number>(() => Date.now());
  const [pastSelectionError, setPastSelectionError] = useState<string | null>(null);

  const openModal = () => {
    const nowMs = Date.now();
    setModalNowMs(nowMs);
    setPastSelectionError(null);
    const initial =
      value && !Number.isNaN(new Date(value).getTime())
        ? new Date(value)
        : getDefaultDraftDate();
    setDraftDate(initial);
    setCalendarMonthKey(toDateKey(initial));
    setOpen(true);
  };

  const todayDateKey = toDateKey(new Date(modalNowMs));

  const selectCalendarDate = (day: DateData) => {
    if (disallowPast && day.dateString < todayDateKey) {
      setPastSelectionError('Past dates cannot be selected. Choose today or a future date.');
      return;
    }
    setPastSelectionError(null);
    setDraftDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(day.year, day.month - 1, day.day);
      return next;
    });
  };

  const applyQuickDateOffset = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    setPastSelectionError(null);
    setDraftDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
      return next;
    });
    setCalendarMonthKey(toDateKey(target));
  };

  const updateDraftTime = (hour24: number, minute: number) => {
    setPastSelectionError(null);
    setDraftDate((prev) => {
      const next = new Date(prev);
      next.setHours(hour24, minute, 0, 0);
      return next;
    });
  };

  const handleApply = () => {
    if (disallowPast && draftDate.getTime() <= Date.now()) {
      setPastSelectionError('Selected date & time is in the past. Pick a future time.');
      return;
    }
    onChange(draftDate.toISOString());
    setOpen(false);
  };

  const selectedDateKey = toDateKey(draftDate);
  const isDraftInPast = disallowPast && draftDate.getTime() <= modalNowMs;

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
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
          {label}
        </Text>
        {!required && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text style={[Typography.small, { color: palette.accentMint }]}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={openModal}
        style={[
          styles.trigger,
          {
            backgroundColor: palette.surfaceGlass,
            borderColor: error ? palette.danger : palette.border,
          },
        ]}
      >
        <AppIcon
          name="calendar"
          size={18}
          color={error ? palette.dangerText : palette.accentMint}
        />
        <Text
          style={[
            Typography.body,
            styles.triggerText,
            { color: value ? palette.text : palette.placeholder },
          ]}
          numberOfLines={1}
        >
          {value ? formatFullDateTime(value) : placeholder}
        </Text>
        <AppIcon name="chevron" size={16} color={palette.textMuted} />
      </Pressable>

      {error ? (
        <Text style={[Typography.small, { color: palette.dangerText }]}>{error}</Text>
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
              <Text style={[Typography.h3, { color: palette.text }]}>Select Date & Time</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.sheetScroll}
            >
              <View
                style={[
                  styles.previewPanel,
                  {
                    backgroundColor:
                      isDraftInPast || pastSelectionError ? palette.dangerSoft : palette.sageTint,
                    borderColor:
                      isDraftInPast || pastSelectionError ? palette.danger : palette.border,
                  },
                ]}
              >
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Selected deadline
                </Text>
                <Text style={[Typography.bodySemiBold, { color: palette.text, marginTop: 2 }]}>
                  {formatFullDateTime(draftDate.toISOString())}
                </Text>
                {pastSelectionError || isDraftInPast ? (
                  <Text style={[Typography.small, { color: palette.dangerText, marginTop: 4 }]}>
                    {pastSelectionError ?? 'Choose a date & time later than right now.'}
                  </Text>
                ) : null}
              </View>

              {/* Quick Date Presets */}
              <View style={styles.quickRow}>
                {[
                  { label: 'Tomorrow', offset: 1 },
                  { label: '+2 days', offset: 2 },
                  { label: '+3 days', offset: 3 },
                  { label: '+1 week', offset: 7 },
                ].map((preset) => (
                  <Pressable
                    key={preset.label}
                    onPress={() => applyQuickDateOffset(preset.offset)}
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

              {/* Library Calendar with 1:1 Symmetrical Day Circles & Clean Chevrons */}
              <View
                style={[
                  styles.calendarCard,
                  { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                ]}
              >
                <Calendar
                  key={calendarMonthKey.slice(0, 7)}
                  current={calendarMonthKey}
                  minDate={disallowPast ? todayDateKey : undefined}
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
                    const isSelected = date.dateString === selectedDateKey;
                    const isToday = date.dateString === todayDateKey;
                    const isPastDay = disallowPast && date.dateString < todayDateKey;
                    const isOutsideMonth = state === 'disabled' || isPastDay;

                    return (
                      <View style={styles.dayCellWrapper}>
                        <Pressable
                          disabled={isPastDay}
                          onPress={() => selectCalendarDate(date)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected, disabled: isPastDay }}
                          accessibilityLabel={date.dateString}
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
                                color: isSelected && !isPastDay
                                  ? '#ffffff'
                                  : isToday
                                    ? palette.accentMint
                                    : isOutsideMonth
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

              {/* Borderless Infinite-Loop 3-Column Scroll-Wheel Time Picker */}
              <View style={styles.timeSection}>
                <View style={styles.timeCardHeader}>
                  <AppIcon name="clock" size={16} color={palette.accentMint} />
                  <Text style={[Typography.label, { color: palette.text }]}>
                    Exact time
                  </Text>
                </View>
                <ExactTimeSelector
                  hour24={draftDate.getHours()}
                  minute={draftDate.getMinutes()}
                  onChangeTime={updateDraftTime}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {!required ? (
                <SecondaryButton
                  title="Clear"
                  compact
                  onPress={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  style={styles.flexOne}
                />
              ) : (
                <SecondaryButton
                  title="Cancel"
                  compact
                  onPress={() => setOpen(false)}
                  style={styles.flexOne}
                />
              )}
              <PrimaryButton
                title="Apply"
                compact
                onPress={handleApply}
                fullWidth={false}
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
  wrapper: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontWeight: '600' },
  trigger: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  triggerText: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  sheet: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '90%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetScroll: { gap: Spacing.md },
  previewPanel: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  quickRow: { flexDirection: 'row', gap: Spacing.xs + 2, flexWrap: 'wrap' },
  quickChip: {
    flexGrow: 1,
    minWidth: 68,
    paddingHorizontal: Spacing.sm + 2,
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
  timeSection: { paddingHorizontal: Spacing.xs, gap: Spacing.sm },
  timeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  flexOne: { flex: 1 },
});
