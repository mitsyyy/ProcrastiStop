import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SelectField } from '@/components/ui/SelectField';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { FOCUS_DURATION_PRESETS } from '@/constants/categories';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { CHECKPOINT_ITEM_OPTIONS } from '@/features/checkpoints/checkpointAnalyzer';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import type { CheckpointTargetItem } from '@/types/task';
import { formatDeadlineLabel } from '@/utils/date';
import { validateFocusDuration } from '@/utils/validation';

export default function FocusSetupScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const { taskId: initialTaskId } = useLocalSearchParams<{ taskId?: string }>();

  const tasks = useTaskStore((s) => s.tasks);
  const preferences = useSettingsStore((s) => s.preferences);
  const updatePreferences = useSettingsStore((s) => s.updatePreferences);

  const blockerSettings = useBlockerStore((s) => s.settings);
  const permissions = useBlockerStore((s) => s.permissions);
  const toggleBlockDuringFocus = useBlockerStore((s) => s.toggleBlockDuringFocus);

  const startSession = useFocusStore((s) => s.startSession);

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'missed',
      ),
    [tasks],
  );

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    () => initialTaskId ?? openTasks[0]?.id ?? null,
  );
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState<number>(
    preferences.focusDefaultMinutes || 45,
  );
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState(String(preferences.focusDefaultMinutes || 45));
  const [customError, setCustomError] = useState<string | undefined>(undefined);

  const [checkpointEnabled, setCheckpointEnabled] = useState(preferences.checkpointEnabled);
  const [requiredItem, setRequiredItem] = useState<CheckpointTargetItem>(() => {
    const initial = tasks.find((t) => t.id === (initialTaskId ?? openTasks[0]?.id));
    return initial?.requiredCheckpointItem ?? 'book';
  });
  const [reminderEnabled, setReminderEnabled] = useState(preferences.notificationsEnabled);
  const [starting, setStarting] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedApps = blockerSettings.selectedApps.filter((a) => a.selected);
  const allMockPermissionsGranted =
    permissions.usageAccess === 'granted' && permissions.overlay === 'granted';

  const handleApplyCustomDuration = () => {
    const num = Number(customInput.trim());
    const check = validateFocusDuration(num);
    if (!check.valid) {
      setCustomError(check.error);
      return;
    }
    setCustomError(undefined);
    setDurationMinutes(num);
    setCustomModalOpen(false);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await updatePreferences({
        checkpointEnabled,
        notificationsEnabled: reminderEnabled,
      });

      if (checkpointEnabled) {
        // Open AI Camera Checkpoint Gate FIRST — countdown starts only after ML Kit verifies the item
        router.replace({
          pathname: '/focus/checkpoint',
          params: {
            mode: 'gate',
            duration: String(durationMinutes),
            item: requiredItem,
            ...(selectedTask ? { taskId: selectedTask.id } : {}),
          },
        });
        return;
      }

      await startSession({
        taskId: selectedTask?.id ?? null,
        taskTitleSnapshot: selectedTask?.title ?? 'Open deep work session',
        plannedDurationMinutes: durationMinutes,
        checkpointEnabled: false,
      });
      router.replace('/focus/active');
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScreenBackground variant="surface">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xs,
            paddingBottom: insets.bottom + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <AppHeader
            title="Focus session"
            subtitle="Set up a distraction-free block."
            onBack={() => router.back()}
          />

          <View style={styles.sections}>
            {/* Linked Task Selector */}
            <Card style={styles.sectionCard}>
              <View style={styles.labelRow}>
                <Text style={[Typography.h3, { color: palette.text }]}>Linked task</Text>
                <Pressable onPress={() => router.push('/tasks/create')} hitSlop={8}>
                  <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
                    + New task
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setTaskModalOpen(true)}
                style={[
                  styles.taskSelectorCard,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.sageTint }]}>
                  <AppIcon name="briefcase" size={18} color={palette.accentMint} />
                </View>
                <View style={styles.taskSelectorCopy}>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    {selectedTask ? 'Selected task' : 'Optional task link'}
                  </Text>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]} numberOfLines={1}>
                    {selectedTask?.title ?? 'Open focus session (unlinked)'}
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    {selectedTask
                      ? `${formatDeadlineLabel(selectedTask.deadline)} · ${selectedTask.category}`
                      : 'Tap to link a task from your list'}
                  </Text>
                </View>
                <AppIcon name="chevron" size={18} color={palette.textMuted} />
              </Pressable>
            </Card>

            {/* Duration Presets & Custom */}
            <Card style={styles.sectionCard}>
              <View style={styles.labelRow}>
                <Text style={[Typography.h3, { color: palette.text }]}>Session duration</Text>
                <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
                  {durationMinutes} min selected
                </Text>
              </View>

              <View style={styles.durationRow}>
                {FOCUS_DURATION_PRESETS.map((mins) => {
                  const active = durationMinutes === mins;
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => setDurationMinutes(mins)}
                      style={[
                        styles.durationBtn,
                        {
                          backgroundColor: active
                            ? palette.warningSoft
                            : palette.surfaceMuted,
                          borderColor: active ? palette.energyOrange : palette.border,
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          Typography.h3,
                          { color: active ? palette.energyOrange : palette.text },
                        ]}
                      >
                        {mins}
                      </Text>
                      <Text style={[Typography.small, { color: palette.textMuted, fontSize: 10 }]}>
                        min
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => {
                  setCustomInput(String(durationMinutes));
                  setCustomError(undefined);
                  setCustomModalOpen(true);
                }}
                style={styles.customBtn}
              >
                <AppIcon name="clock" size={16} color={palette.textMuted} />
                <Text style={[Typography.caption, { color: palette.textSecondary, flex: 1 }]}>
                  Custom duration (1–240 min)
                </Text>
                <AppIcon name="chevron" size={16} color={palette.textMuted} />
              </Pressable>

              <Divider />

              <View style={styles.breakSummaryRow}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Break plan: {preferences.shortBreakMinutes}m short break ·{' '}
                  {preferences.longBreakMinutes}m long break
                </Text>
              </View>
            </Card>

            {/* Distraction Management */}
            <Card style={styles.sectionCard}>
              <View style={styles.labelRow}>
                <View>
                  <Text style={[Typography.h3, { color: palette.text }]}>
                    Distraction management
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    {selectedApps.length} Android app{selectedApps.length === 1 ? '' : 's'} selected
                  </Text>
                </View>
                <Pressable onPress={() => router.push('/(tabs)/focus')} hitSlop={8}>
                  <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
                    Edit apps
                  </Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.blockerPreviewBox,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                ]}
              >
                <View style={styles.blockerInfoLeft}>
                  <View style={styles.appTagsRow}>
                    {selectedApps.slice(0, 3).map((app) => (
                      <View
                        key={app.packageName}
                        style={[styles.appPill, { backgroundColor: palette.surfaceGlassStrong }]}
                      >
                        <Text style={[Typography.small, { color: palette.text }]}>
                          {app.displayName}
                        </Text>
                      </View>
                    ))}
                    {selectedApps.length === 0 ? (
                      <Text style={[Typography.small, { color: palette.textMuted }]}>
                        No apps restricted yet
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[Typography.small, { color: palette.textMuted, marginTop: 4 }]}>
                    Frontend simulation ·{' '}
                    {allMockPermissionsGranted
                      ? 'Simulated permissions granted'
                      : 'Simulated permissions pending'}
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.blockDuringFocus && blockerSettings.enabled}
                  disabled={!blockerSettings.enabled}
                  onValueChange={(v) => void toggleBlockDuringFocus(v)}
                />
              </View>
            </Card>

            {/* Checkpoint & Reminder Toggles */}
            <Card style={styles.sectionCard}>
              <View style={styles.toggleRow}>
                <View style={[styles.iconBox, { backgroundColor: palette.sageTint }]}>
                  <AppIcon name="camera" size={18} color={palette.accentMint} />
                </View>
                <View style={styles.toggleCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    AI Camera Checkpoint Gate
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Verify your required desk item via offline Google ML Kit before starting
                  </Text>
                </View>
                <ToggleSwitch value={checkpointEnabled} onValueChange={setCheckpointEnabled} />
              </View>

              {checkpointEnabled ? (
                <SelectField
                  label="Required item to scan before session"
                  value={requiredItem}
                  options={CHECKPOINT_ITEM_OPTIONS.map((opt) => ({
                    label: opt.label,
                    value: opt.key,
                    subtitle: opt.promptHint,
                  }))}
                  onChange={setRequiredItem}
                  icon="camera"
                />
              ) : null}

              <Divider />

              <View style={styles.toggleRow}>
                <View style={[styles.iconBox, { backgroundColor: palette.sageTint }]}>
                  <AppIcon name="bell" size={18} color={palette.accentMint} />
                </View>
                <View style={styles.toggleCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Session reminders
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    {preferences.remindBeforeSessionMinutes}m reminder lead time configured
                  </Text>
                </View>
                <ToggleSwitch value={reminderEnabled} onValueChange={setReminderEnabled} />
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Start CTA */}
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
          <PrimaryButton
            title={`Start ${durationMinutes}-minute session`}
            icon="play"
            tone="energy"
            loading={starting}
            onPress={() => void handleStart()}
          />
        </View>
      </View>

      {/* Task Picker Modal */}
      <Modal
        visible={taskModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskModalOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setTaskModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[Typography.h3, { color: palette.text }]}>Choose task to link</Text>
              <Pressable onPress={() => setTaskModalOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => {
                  setSelectedTaskId(null);
                  setTaskModalOpen(false);
                }}
                style={[
                  styles.taskOptRow,
                  {
                    borderColor: palette.borderSubtle,
                    backgroundColor: selectedTaskId === null ? palette.sageTint : 'transparent',
                  },
                ]}
              >
                <Text style={[Typography.bodySemiBold, { color: palette.text, flex: 1 }]}>
                  Open focus session (no linked task)
                </Text>
                {selectedTaskId === null ? (
                  <AppIcon name="check" size={18} color={palette.accentMint} />
                ) : null}
              </Pressable>

              {openTasks.map((t) => {
                const isSel = selectedTaskId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      setSelectedTaskId(t.id);
                      if (t.requiredCheckpointItem) {
                        setRequiredItem(t.requiredCheckpointItem);
                      }
                      setTaskModalOpen(false);
                    }}
                    style={[
                      styles.taskOptRow,
                      {
                        borderColor: palette.borderSubtle,
                        backgroundColor: isSel ? palette.sageTint : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.taskOptCopy}>
                      <Text style={[Typography.bodySemiBold, { color: palette.text }]} numberOfLines={1}>
                        {t.title}
                      </Text>
                      <Text style={[Typography.small, { color: palette.textMuted }]}>
                        {formatDeadlineLabel(t.deadline)} · {t.category}
                      </Text>
                    </View>
                    {isSel ? <AppIcon name="check" size={18} color={palette.accentMint} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Duration Modal */}
      <Modal
        visible={customModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setCustomModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <Text style={[Typography.h3, { color: palette.text }]}>Custom duration (minutes)</Text>
            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              keyboardType="number-pad"
              placeholder="e.g. 50"
              placeholderTextColor={palette.placeholder}
              style={[
                Typography.body,
                styles.customInput,
                {
                  color: palette.text,
                  borderColor: customError ? palette.danger : palette.border,
                  backgroundColor: palette.surfaceGlass,
                },
              ]}
              autoFocus
            />
            {customError ? (
              <Text style={[Typography.small, { color: palette.dangerText }]}>{customError}</Text>
            ) : null}
            <PrimaryButton title="Apply duration" onPress={handleApplyCustomDuration} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
  },
  sections: {
    gap: Spacing.lg,
  },
  sectionCard: {
    gap: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  taskSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskSelectorCopy: {
    flex: 1,
    gap: 2,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationBtn: {
    flex: 1,
    minHeight: 60,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  breakSummaryRow: {
    paddingTop: 2,
  },
  blockerPreviewBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  blockerInfoLeft: {
    flex: 1,
  },
  appTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  appPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
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
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 340,
  },
  taskOptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  taskOptCopy: {
    flex: 1,
    gap: 2,
  },
  customInput: {
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
});
