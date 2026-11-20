import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { FOCUS_DURATION_PRESETS } from '@/constants/categories';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { formatDeadlineLabel } from '@/utils/date';

export default function FocusSetupScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const { taskId: initialTaskId } = useLocalSearchParams<{ taskId?: string }>();

  const tasks = useTaskStore((s) => s.tasks);
  const preferences = useSettingsStore((s) => s.preferences);
  const updatePreferences = useSettingsStore((s) => s.updatePreferences);
  const blockerSettings = useBlockerStore((s) => s.settings);
  const toggleBlockDuringFocus = useBlockerStore((s) => s.toggleBlockDuringFocus);
  const startSession = useFocusStore((s) => s.startSession);

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
    [tasks],
  );

  const selectedTask = tasks.find((t) => t.id === (initialTaskId ?? openTasks[0]?.id)) ?? null;
  const [durationMinutes, setDurationMinutes] = useState<number>(
    preferences.focusDefaultMinutes || 45,
  );
  const [checkpointEnabled, setCheckpointEnabled] = useState(preferences.checkpointEnabled);
  const [reminderEnabled, setReminderEnabled] = useState(preferences.notificationsEnabled);
  const [starting, setStarting] = useState(false);

  const selectedApps = blockerSettings.selectedApps.filter((a) => a.selected);

  const handleStart = async () => {
    setStarting(true);
    try {
      await updatePreferences({ checkpointEnabled, notificationsEnabled: reminderEnabled });
      await startSession({
        taskId: selectedTask?.id ?? null,
        taskTitleSnapshot: selectedTask?.title ?? 'Open deep work session',
        plannedDurationMinutes: durationMinutes,
        checkpointEnabled,
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
          { paddingTop: insets.top + Spacing.xs, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <AppHeader
            title="Focus session"
            subtitle="Set up a distraction-free block."
            onBack={() => router.back()}
          />

          <View style={styles.sections}>
            <Card style={styles.sectionCard}>
              <Text style={[Typography.h3, { color: palette.text }]}>Linked task</Text>
              <View
                style={[
                  styles.taskSelectorCard,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: palette.sageTint }]}>
                  <AppIcon name="briefcase" size={18} color={palette.accentMint} />
                </View>
                <View style={styles.taskSelectorCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]} numberOfLines={1}>
                    {selectedTask?.title ?? 'Open focus session (unlinked)'}
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    {selectedTask ? formatDeadlineLabel(selectedTask.deadline) : 'No task linked'}
                  </Text>
                </View>
              </View>
            </Card>

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
                          backgroundColor: active ? palette.warningSoft : palette.surfaceMuted,
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
              <Divider />
              <Text style={[Typography.small, { color: palette.textMuted }]}>
                Break plan: {preferences.shortBreakMinutes}m short · {preferences.longBreakMinutes}m long
              </Text>
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Distraction management ({selectedApps.length} apps)
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Stage 1 frontend simulation
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.blockDuringFocus && blockerSettings.enabled}
                  disabled={!blockerSettings.enabled}
                  onValueChange={(v) => void toggleBlockDuringFocus(v)}
                />
              </View>
              <Divider />
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Visual checkpoints
                  </Text>
                </View>
                <ToggleSwitch value={checkpointEnabled} onValueChange={setCheckpointEnabled} />
              </View>
              <Divider />
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Session reminders
                  </Text>
                </View>
                <ToggleSwitch value={reminderEnabled} onValueChange={setReminderEnabled} />
              </View>
            </Card>
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
          <PrimaryButton
            title={`Start ${durationMinutes}-minute session`}
            icon="play"
            tone="energy"
            loading={starting}
            onPress={() => void handleStart()}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth },
  sections: { gap: Spacing.lg },
  sectionCard: { gap: Spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskSelectorCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  taskSelectorCopy: { flex: 1, gap: 2 },
  durationRow: { flexDirection: 'row', gap: Spacing.sm },
  durationBtn: { flex: 1, minHeight: 60, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleCopy: { flex: 1, gap: 2 },
  stickyFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingTop: Spacing.md, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  footerInner: { width: '100%', maxWidth: Layout.maxContentWidth },
});
