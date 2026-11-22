import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { formatTimeShort } from '@/features/tasks/antiProcrastinationScheduler';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export default function FocusCompletedScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const lastCompletedSession = useFocusStore((s) => s.lastCompletedSession);
  const lastSkippedRescheduledAt = useFocusStore((s) => s.lastSkippedRescheduledAt);
  const sessions = useFocusStore((s) => s.sessions);
  const checkpoints = useFocusStore((s) => s.checkpoints);
  const clearLastCompleted = useFocusStore((s) => s.clearLastCompleted);

  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const showToast = useSettingsStore((s) => s.showToast);

  const session = lastCompletedSession ?? sessions[0] ?? null;

  const linkedTask = useMemo(
    () => (session?.taskId ? tasks.find((t) => t.id === session.taskId) ?? null : null),
    [session, tasks],
  );

  const sessionCheckpoints = useMemo(
    () => (session ? checkpoints.filter((c) => c.sessionId === session.id) : []),
    [session, checkpoints],
  );

  const isSkipped = session?.status === 'skipped';
  const isMissed = session?.status === 'missed';
  const rescheduledIso =
    !isMissed ? (lastSkippedRescheduledAt ?? linkedTask?.rescheduledStartAt ?? null) : null;
  const rescheduledLabel = rescheduledIso
    ? formatTimeShort(new Date(rescheduledIso))
    : '1 hour from now';

  const focusedMinutes = session
    ? isSkipped || isMissed
      ? Math.round(session.actualFocusSeconds / 60)
      : Math.max(1, Math.round(session.actualFocusSeconds / 60))
    : 45;

  const handleToggleLinkedTaskCompleted = async () => {
    if (!linkedTask) return;
    const nextStatus = linkedTask.status === 'completed' ? 'in_progress' : 'completed';
    await updateTask(linkedTask.id, { status: nextStatus });
    showToast(
      nextStatus === 'completed'
        ? `Marked "${linkedTask.title}" completed!`
        : `Reopened "${linkedTask.title}".`,
      'success',
    );
  };

  const handleReturnHome = () => {
    clearLastCompleted();
    router.replace('/(tabs)/home');
  };

  const handleContinueWorking = () => {
    clearLastCompleted();
    router.replace(
      linkedTask
        ? { pathname: '/focus/setup', params: { taskId: linkedTask.id } }
        : '/focus/setup',
    );
  };

  return (
    <ScreenBackground variant="home">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xxxl,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.heroCenter}>
            <View
              style={[
                styles.successCircle,
                palette.mode === 'light' && Shadows.card,
                {
                  backgroundColor: isMissed
                    ? palette.danger
                    : isSkipped
                      ? palette.warning
                      : palette.primary,
                  borderColor: isMissed
                    ? palette.dangerSoft
                    : isSkipped
                      ? palette.warningSoft
                      : palette.sageTint,
                },
              ]}
            >
              <AppIcon
                name={isMissed ? 'alert' : isSkipped ? 'clock' : 'check'}
                size={38}
                color="#ffffff"
                strokeWidth={2.4}
              />
            </View>

            <Text
              style={[
                Typography.eyebrow,
                {
                  color: isMissed
                    ? palette.dangerText
                    : isSkipped
                      ? palette.warningText
                      : palette.accentMint,
                },
              ]}
            >
              {isMissed
                ? 'Missed · No +1h Retry'
                : isSkipped
                  ? 'Skipped · Rescheduled +1h'
                  : session?.status === 'cancelled'
                    ? 'Session wrapped up'
                    : 'Nicely done'}
            </Text>
            <Text style={[Typography.h1, styles.headline, { color: palette.text }]}>
              {isMissed
                ? 'Session marked Missed.'
                : isSkipped
                  ? 'Session marked Skipped.'
                  : session?.status === 'cancelled'
                    ? 'Focus time saved.'
                    : 'Session completed.'}
            </Text>
            <Text style={[Typography.body, styles.subCopy, { color: palette.textMuted }]}>
              {isMissed
                ? 'The task due date was reached or its scheduled window ended unstarted. All alarms and +1h retries have been cancelled.'
                : isSkipped
                  ? `Not marked completed. We automatically re-queued this task for ${rescheduledLabel} with a 5-min pre-session warning and auto-start alarm.`
                  : 'You protected dedicated time for what mattered most.'}
            </Text>

            <View style={styles.durationRow}>
              <Text style={[Typography.completionNumber, { color: palette.text }]}>
                {focusedMinutes}
              </Text>
              <View>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>minutes</Text>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                  {isMissed ? 'logged' : isSkipped ? 'before skip' : 'focused'}
                </Text>
              </View>
            </View>
          </View>

          {isSkipped && !isMissed && rescheduledIso ? (
            <View
              style={[
                styles.rescheduleBanner,
                { backgroundColor: palette.warningSoft, borderColor: palette.warning },
              ]}
            >
              <AppIcon name="bell" size={18} color={palette.warningText} />
              <View style={styles.resultCopy}>
                <Text style={[Typography.bodySemiBold, { color: palette.warningText }]}>
                  Auto-rescheduled for {rescheduledLabel}
                </Text>
                <Text style={[Typography.small, { color: palette.textSecondary }]}>
                  Your 5-minute warning and full-screen focus alarm are queued to bring you back on
                  track.
                </Text>
              </View>
            </View>
          ) : null}

          <Card style={styles.summaryCard}>
            <View style={styles.resultRow}>
              <AppIcon name="briefcase" size={18} color={palette.accentMint} />
              <View style={styles.resultCopy}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Task</Text>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]} numberOfLines={1}>
                  {session?.taskTitleSnapshot ?? 'Open focus session'}
                </Text>
              </View>
            </View>

            <Divider />

            <View style={styles.resultRow}>
              <AppIcon name="camera" size={18} color={palette.accentMint} />
              <View style={styles.resultCopy}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Checkpoints</Text>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {session
                    ? `${session.completedCheckpointCount} passed of ${session.checkpointCount} attempted`
                    : '0 checkpoints'}
                  {sessionCheckpoints.length > 0 && sessionCheckpoints[0].detectedObjects.length > 0
                    ? ` (${sessionCheckpoints[0].detectedObjects.join(', ')})`
                    : ''}
                </Text>
              </View>
            </View>

            <Divider />

            <View style={styles.resultRow}>
              <AppIcon name="shield" size={18} color={palette.accentMint} />
              <View style={styles.resultCopy}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Pauses & simulated interruptions
                </Text>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {session?.pauseCount ?? 0} pause{session?.pauseCount === 1 ? '' : 's'} ·{' '}
                  {session?.interruptionCount ?? 0} redirected attempt
                  {session?.interruptionCount === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Optional linked task status update (only offered when session actually completed) */}
          {linkedTask && !isSkipped ? (
            <Pressable
              onPress={() => void handleToggleLinkedTaskCompleted()}
              style={[
                styles.taskToggleCard,
                {
                  backgroundColor:
                    linkedTask.status === 'completed'
                      ? palette.successSoft
                      : palette.surfaceGlass,
                  borderColor:
                    linkedTask.status === 'completed' ? palette.success : palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.checkSquare,
                  {
                    backgroundColor:
                      linkedTask.status === 'completed' ? palette.success : 'transparent',
                    borderColor:
                      linkedTask.status === 'completed' ? palette.success : palette.textMuted,
                  },
                ]}
              >
                {linkedTask.status === 'completed' ? (
                  <AppIcon name="check" size={14} color="#ffffff" />
                ) : null}
              </View>
              <View style={styles.taskToggleCopy}>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {linkedTask.status === 'completed'
                    ? 'Task marked completed'
                    : 'Mark linked task as completed'}
                </Text>
                <Text style={[Typography.small, { color: palette.textMuted }]} numberOfLines={1}>
                  {linkedTask.title}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              title={isSkipped ? 'Restart Focus Now' : 'Start Another Session'}
              icon="play"
              tone="energy"
              onPress={handleContinueWorking}
            />
            <SecondaryButton
              title="Return to Dashboard"
              onPress={handleReturnHome}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    gap: Spacing.xl,
  },
  heroCenter: {
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  successCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headline: {
    textAlign: 'center',
    fontSize: 30,
  },
  subCopy: {
    textAlign: 'center',
    maxWidth: 320,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  rescheduleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md + 2,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  summaryCard: {
    gap: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  taskToggleCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkSquare: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskToggleCopy: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: Spacing.md,
  },
});
