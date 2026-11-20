import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { formatTime12HourLabel, TimeOfDayPicker } from '@/components/ui/TimeOfDayPicker';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { TASK_CATEGORIES } from '@/constants/categories';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import {
  buildBufferedDeadlineIso,
  computeDailyNudgeDates,
  computePreSessionAlertDate,
  computeTargetCompletionIso,
  DEFAULT_DAILY_SESSION_TIME,
  formatTimeShort,
  getSessionDateForDay,
  hasSufficientDeadlineBuffer,
  MIN_DAILY_REMINDERS,
  normalizeDailyReminderCount,
} from '@/features/tasks/antiProcrastinationScheduler';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';
import type { Task, TaskPriority } from '@/types/task';
import { formatFullDateTime } from '@/utils/date';
import {
  validateDailyReminderCount,
  validateEstimatedMinutes,
  validateTaskDeadline,
  validateTaskTitle,
} from '@/utils/validation';

export interface TaskFormValues {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  deadline: string;
  targetCompletionAt: string | null;
  dailySessionStartTime: string;
  dailyReminderCount: number;
  autoStartEnabled: boolean;
  estimatedMinutes: number | null;
}

interface TaskFormProps {
  mode: 'create' | 'edit';
  initialTask?: Task;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const DAILY_REMINDER_OPTIONS = [3, 4, 5, 6] as const;

export function TaskForm({ mode, initialTask, onSubmit, onCancel }: TaskFormProps) {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const preferences = useSettingsStore((s) => s.preferences);

  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [category, setCategory] = useState(initialTask?.category ?? 'Work');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority ?? 'medium');
  const [deadline, setDeadline] = useState<string | null>(() =>
    initialTask?.deadline ?? (mode === 'create' ? buildBufferedDeadlineIso(null) : null),
  );
  const [dailySessionStartTime, setDailySessionStartTime] = useState<string>(
    initialTask?.dailySessionStartTime ??
      preferences.defaultDailySessionStartTime ??
      DEFAULT_DAILY_SESSION_TIME,
  );
  const [dailyReminderCount, setDailyReminderCount] = useState<number>(() =>
    normalizeDailyReminderCount(
      initialTask?.dailyReminderCount ?? preferences.defaultDailyReminderCount,
    ),
  );
  const [autoStartEnabled, setAutoStartEnabled] = useState<boolean>(
    initialTask?.autoStartEnabled ?? true,
  );
  const [estimatedInput, setEstimatedInput] = useState(
    initialTask?.estimatedMinutes ? String(initialTask.estimatedMinutes) : '45',
  );
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [saving, setSaving] = useState(false);

  const titleCheck = validateTaskTitle(title);
  const deadlineCheck = validateTaskDeadline(deadline);
  const reminderCheck = validateDailyReminderCount(dailyReminderCount);
  const estimateCheck = validateEstimatedMinutes(estimatedInput);

  const titleError = submittedOnce && !titleCheck.valid ? titleCheck.error : undefined;
  const deadlineError = submittedOnce && !deadlineCheck.valid ? deadlineCheck.error : undefined;
  const reminderError = submittedOnce && !reminderCheck.valid ? reminderCheck.error : undefined;
  const estimateError = !estimateCheck.valid ? estimateCheck.error : undefined;

  const targetCompletionIso = useMemo(
    () => computeTargetCompletionIso(deadline),
    [deadline],
  );
  const hasBuffer = useMemo(() => hasSufficientDeadlineBuffer(deadline), [deadline]);

  const schedulePreview = useMemo(() => {
    const sampleSession = getSessionDateForDay(new Date(), dailySessionStartTime);
    const nudgeDates = computeDailyNudgeDates(sampleSession, dailyReminderCount);
    const preAlert = computePreSessionAlertDate(
      sampleSession,
      preferences.remindBeforeSessionMinutes,
    );
    return {
      nudgesText: nudgeDates.map(formatTimeShort).join(' · '),
      preAlertText: formatTimeShort(preAlert),
      sessionText: formatTime12HourLabel(dailySessionStartTime),
    };
  }, [dailySessionStartTime, dailyReminderCount, preferences.remindBeforeSessionMinutes]);

  const categoryOptions = TASK_CATEGORIES.map((cat) => ({
    label: cat,
    value: cat,
  }));

  const handleSave = async () => {
    setSubmittedOnce(true);
    if (
      !titleCheck.valid ||
      !deadlineCheck.valid ||
      !reminderCheck.valid ||
      !estimateCheck.valid ||
      !deadline
    ) {
      return;
    }

    setSaving(true);
    try {
      const parsedMinutes = estimatedInput.trim() ? Number(estimatedInput.trim()) : null;
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        deadline,
        targetCompletionAt: computeTargetCompletionIso(deadline),
        dailySessionStartTime,
        dailyReminderCount: normalizeDailyReminderCount(dailyReminderCount),
        autoStartEnabled,
        estimatedMinutes: parsedMinutes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground variant="surface">
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.xs,
              paddingBottom: insets.bottom + 116,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.innerContainer}>
            <AppHeader
              title={mode === 'create' ? 'Create task' : 'Edit task'}
              subtitle={
                mode === 'create'
                  ? 'Set a firm deadline with a 24h anti-cramming buffer and daily nudges.'
                  : 'Adjust deadline buffer, daily focus time, or reminder cadence.'
              }
              onBack={onCancel}
            />

            <View style={styles.formStack}>
              <TextField
                label="Task title"
                placeholder="What needs to be done?"
                value={title}
                onChangeText={setTitle}
                error={titleError}
                returnKeyType="next"
              />

              <TextField
                label="Description"
                optionalTag="Optional"
                placeholder="Add notes, deliverables, or a clear outcome..."
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Mandatory Deadline + 24-Hour Anti-Procrastination Buffer */}
              <View style={styles.fieldGroup}>
                <DateTimePicker
                  label="Actual deadline (required)"
                  value={deadline}
                  onChange={setDeadline}
                  required
                  error={deadlineError}
                />

                {deadline ? (
                  <View
                    style={[
                      styles.bufferCard,
                      {
                        backgroundColor: hasBuffer ? palette.sageTint : palette.warningSoft,
                        borderColor: hasBuffer ? palette.accentMint : palette.warning,
                      },
                    ]}
                  >
                    <View style={styles.bufferHeader}>
                      <AppIcon
                        name={hasBuffer ? 'shield' : 'alert'}
                        size={17}
                        color={hasBuffer ? palette.accentMint : palette.warningText}
                      />
                      <Text
                        style={[
                          Typography.caption,
                          {
                            color: hasBuffer ? palette.accentMint : palette.warningText,
                            fontWeight: '700',
                            flex: 1,
                          },
                        ]}
                      >
                        {hasBuffer
                          ? '24-hour anti-cramming buffer active'
                          : 'Deadline is under 24 hours away'}
                      </Text>
                    </View>

                    <Text style={[Typography.small, { color: palette.text }]}>
                      Target completion: {formatFullDateTime(targetCompletionIso)}
                    </Text>

                    <Text style={[Typography.small, { color: palette.textMuted }]}>
                      {hasBuffer
                        ? 'ProcrastiStop aims to finish this task at least 1 full day before your deadline so you never rush at the last minute.'
                        : 'This leaves less than a full day of buffer. Shift your deadline by +24h to keep healthy lead time, or start immediately.'}
                    </Text>

                    {!hasBuffer ? (
                      <Pressable
                        onPress={() => setDeadline(buildBufferedDeadlineIso(deadline))}
                        style={[
                          styles.bufferFixBtn,
                          { backgroundColor: palette.surfaceElevated, borderColor: palette.warning },
                        ]}
                      >
                        <AppIcon name="calendar" size={14} color={palette.warningText} />
                        <Text
                          style={[
                            Typography.small,
                            { color: palette.warningText, fontWeight: '700' },
                          ]}
                        >
                          Add 24h safety buffer
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* Daily Focus Session & Free-Will Nudges */}
              <View
                style={[
                  styles.scheduleCard,
                  { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                ]}
              >
                <View style={styles.scheduleTitleRow}>
                  <AppIcon name="bell" size={18} color={palette.accentMint} />
                  <View style={styles.flexOne}>
                    <Text style={[Typography.label, { color: palette.text }]}>
                      Daily Focus & Escalation Plan
                    </Text>
                    <Text style={[Typography.small, { color: palette.textMuted }]}>
                      Free-will nudges first, automatic session launch if ignored.
                    </Text>
                  </View>
                </View>

                <TimeOfDayPicker
                  label="Daily focus session start time"
                  value={dailySessionStartTime}
                  onChange={setDailySessionStartTime}
                  helperText="Exact time your daily focus session begins until this task is done."
                />

                <View style={styles.fieldGroup}>
                  <View style={styles.nudgeLabelRow}>
                    <Text
                      style={[Typography.caption, styles.label, { color: palette.textSecondary }]}
                    >
                      Free-will reminders per day
                    </Text>
                    <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
                      Min {MIN_DAILY_REMINDERS}/day
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.segmented,
                      { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                    ]}
                  >
                    {DAILY_REMINDER_OPTIONS.map((count) => {
                      const active = dailyReminderCount === count;
                      return (
                        <Pressable
                          key={count}
                          onPress={() => setDailyReminderCount(count)}
                          style={[
                            styles.segBtn,
                            active && {
                              backgroundColor: palette.surfaceGlassStrong,
                              borderColor: palette.accentMint,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              Typography.caption,
                              {
                                color: active ? palette.accentMint : palette.textMuted,
                                fontWeight: active ? '700' : '600',
                              },
                            ]}
                          >
                            {count}× / day
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {reminderError ? (
                    <Text style={[Typography.small, { color: palette.dangerText }]}>
                      {reminderError}
                    </Text>
                  ) : null}

                  <View
                    style={[
                      styles.previewTimeline,
                      { backgroundColor: palette.surfaceMuted, borderColor: palette.borderSubtle },
                    ]}
                  >
                    <Text style={[Typography.small, { color: palette.textSecondary }]}>
                      Free-will nudges: {schedulePreview.nudgesText}
                    </Text>
                    <Text style={[Typography.small, { color: palette.accentMint }]}>
                      {preferences.remindBeforeSessionMinutes}-min warning: {schedulePreview.preAlertText}{' '}
                      · Session start: {schedulePreview.sessionText}
                    </Text>
                  </View>
                </View>

                <View style={styles.autoStartRow}>
                  <View style={styles.flexOne}>
                    <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                      Auto-launch focus at {schedulePreview.sessionText}
                    </Text>
                    <Text style={[Typography.small, { color: palette.textMuted }]}>
                      If you haven&apos;t started after all {dailyReminderCount} nudges, the timer
                      starts automatically.
                    </Text>
                  </View>
                  <ToggleSwitch value={autoStartEnabled} onValueChange={setAutoStartEnabled} />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
                  Priority
                </Text>
                <View
                  style={[
                    styles.segmented,
                    { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                  ]}
                >
                  {PRIORITIES.map((item) => {
                    const active = priority === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => setPriority(item.value)}
                        style={[
                          styles.segBtn,
                          active && {
                            backgroundColor: palette.surfaceGlassStrong,
                            borderColor: palette.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.caption,
                            {
                              color: active ? palette.accentMint : palette.textMuted,
                              fontWeight: active ? '700' : '600',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.twoCol}>
                <SelectField
                  label="Category"
                  value={category}
                  options={categoryOptions}
                  onChange={setCategory}
                  icon="briefcase"
                  containerStyle={styles.flexOne}
                />
                <TextField
                  label="Estimate (min)"
                  placeholder="45"
                  value={estimatedInput}
                  onChangeText={setEstimatedInput}
                  keyboardType="number-pad"
                  icon="clock"
                  error={estimateError}
                  containerStyle={styles.flexOne}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            {
              backgroundColor: palette.stickyBarBg,
              borderTopColor: palette.border,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <View style={styles.footerInner}>
            <SecondaryButton title="Cancel" onPress={onCancel} style={styles.cancelBtn} />
            <PrimaryButton
              title={mode === 'create' ? 'Save task' : 'Update task'}
              onPress={handleSave}
              loading={saving}
              disabled={!title.trim()}
              fullWidth={false}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
  },
  formStack: {
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  bufferCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 6,
  },
  bufferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  bufferFixBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
  },
  nudgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTimeline: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    padding: Spacing.sm + 2,
    gap: 3,
  },
  autoStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  segmented: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  footerInner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 1.5,
  },
});
