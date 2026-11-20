import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatFullDateTime } from '@/utils/date';
import { AppIcon } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface DateTimePickerProps {
  label: string;
  value: string | null;
  onChange: (isoOrNull: string | null) => void;
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function getDefaultDeadlineDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(19, 0, 0, 0);
  return date;
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  required = false,
  error,
  containerStyle,
}: DateTimePickerProps) {
  const palette = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() =>
    value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : getDefaultDeadlineDate(),
  );
  const [viewYear, setViewYear] = useState(() => draftDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => draftDate.getMonth());

  const openModal = () => {
    const initial =
      value && !Number.isNaN(new Date(value).getTime())
        ? new Date(value)
        : getDefaultDeadlineDate();
    setDraftDate(initial);
    setViewYear(initial.getFullYear());
    setViewMonth(initial.getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectCalendarDay = (day: number) => {
    setDraftDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(viewYear, viewMonth, day);
      return next;
    });
  };

  const today = new Date();
  const cells = buildCalendarCells(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

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
          {value ? formatFullDateTime(value) : 'Select exact date & time'}
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
              contentContainerStyle={styles.sheetScroll}
            >
              <View
                style={[
                  styles.previewPanel,
                  { backgroundColor: palette.sageTint, borderColor: palette.border },
                ]}
              >
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Selected deadline
                </Text>
                <Text style={[Typography.bodySemiBold, { color: palette.text, marginTop: 2 }]}>
                  {formatFullDateTime(draftDate.toISOString())}
                </Text>
              </View>

              {/* Interactive Calendar Grid */}
              <View
                style={[
                  styles.calendarCard,
                  { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                ]}
              >
                <View style={styles.monthHeader}>
                  <Pressable
                    onPress={() => shiftMonth(-1)}
                    style={[styles.navArrow, { backgroundColor: palette.surfaceMuted }]}
                  >
                    <AppIcon name="arrow" size={16} color={palette.text} />
                  </Pressable>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    {monthLabel}
                  </Text>
                  <Pressable
                    onPress={() => shiftMonth(1)}
                    style={[styles.navArrow, { backgroundColor: palette.surfaceMuted }]}
                  >
                    <AppIcon name="chevron" size={16} color={palette.text} />
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAYS.map((w, idx) => (
                    <Text
                      key={`${w}-${idx}`}
                      style={[Typography.small, styles.weekLabel, { color: palette.textMuted }]}
                    >
                      {w}
                    </Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {cells.map((day, idx) => {
                    if (day === null) {
                      return <View key={`empty-${idx}`} style={styles.dayCell} />;
                    }
                    const isSelected =
                      draftDate.getFullYear() === viewYear &&
                      draftDate.getMonth() === viewMonth &&
                      draftDate.getDate() === day;
                    const isToday =
                      today.getFullYear() === viewYear &&
                      today.getMonth() === viewMonth &&
                      today.getDate() === day;

                    return (
                      <Pressable
                        key={`day-${day}`}
                        onPress={() => selectCalendarDay(day)}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: palette.primary },
                          !isSelected &&
                            isToday && {
                              borderWidth: 1,
                              borderColor: palette.accentMint,
                            },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.caption,
                            {
                              color: isSelected
                                ? '#ffffff'
                                : isToday
                                  ? palette.accentMint
                                  : palette.text,
                              fontWeight: isSelected || isToday ? '700' : '500',
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {!required ? (
                <SecondaryButton
                  title="Clear"
                  onPress={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  style={styles.flexOne}
                />
              ) : (
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setOpen(false)}
                  style={styles.flexOne}
                />
              )}
              <PrimaryButton
                title="Apply"
                onPress={() => {
                  onChange(draftDate.toISOString());
                  setOpen(false);
                }}
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
    maxHeight: '88%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetScroll: { gap: Spacing.md },
  previewPanel: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  calendarCard: { borderRadius: Radii.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabel: { width: '14.28%', textAlign: 'center', fontWeight: '700' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  flexOne: { flex: 1 },
});
