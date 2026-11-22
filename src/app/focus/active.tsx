import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SimulatedBlockerModal } from '@/components/blocker/SimulatedBlockerModal';
import { FocusTimer } from '@/components/focus/FocusTimer';
import { SessionControlBar } from '@/components/focus/SessionControlBar';
import { AppIcon } from '@/components/ui/AppIcon';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import {
  formatTimeShort,
  getLocalDateKey,
  SKIP_RESCHEDULE_DELAY_MS,
} from '@/features/tasks/antiProcrastinationScheduler';
import { useFocusTicker } from '@/hooks/useFocusTicker';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export default function ActiveFocusScreen() {
  const insets = useSafeAreaInsets();
  const { taskId: alarmTaskId, autoStart } = useLocalSearchParams<{
    taskId?: string;
    autoStart?: string;
  }>();
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [nextRetryLabel, setNextRetryLabel] = useState('1 hour from now');
  const autoStartTriggeredRef = useRef(false);

  const openEndModal = () => {
    setNextRetryLabel(formatTimeShort(new Date(Date.now() + SKIP_RESCHEDULE_DELAY_MS)));
    setEndModalVisible(true);
  };

  const activeSession = useFocusStore((s) => s.activeSession);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const startSession = useFocusStore((s) => s.startSession);
  const pauseSession = useFocusStore((s) => s.pauseSession);
  const resumeSession = useFocusStore((s) => s.resumeSession);
  const enterCheckpoint = useFocusStore((s) => s.enterCheckpoint);
  const recordInterruption = useFocusStore((s) => s.recordInterruption);
  const skipSessionAndReschedule = useFocusStore((s) => s.skipSessionAndReschedule);

  const blockerSettings = useBlockerStore((s) => s.settings);
  const runtimeStatus = useBlockerStore((s) => s.runtimeStatus);
  const demoBlockedAppModal = useBlockerStore((s) => s.demoBlockedAppModal);
  const triggerSimulatedBlockedApp = useBlockerStore((s) => s.triggerSimulatedBlockedApp);
  const dismissBlockedAppModal = useBlockerStore((s) => s.dismissBlockedAppModal);
  const toggleBlockDuringFocus = useBlockerStore((s) => s.toggleBlockDuringFocus);

  const preferences = useSettingsStore((s) => s.preferences);
  const showToast = useSettingsStore((s) => s.showToast);

  // Support Android full-screen alarm deep-link: procrastistop://focus/active?taskId=...&autoStart=1
  useEffect(() => {
    if (autoStart !== '1' || autoStartTriggeredRef.current) return;
    if (activeSession?.status === 'active' || activeSession?.status === 'paused') {
      autoStartTriggeredRef.current = true;
      return;
    }
    autoStartTriggeredRef.current = true;

    const launchFromAlarm = async () => {
      const tasks = useTaskStore.getState().tasks;
      const targetTask =
        (alarmTaskId ? tasks.find((t) => t.id === alarmTaskId) : undefined) ??
        tasks.find(
          (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'missed',
        ) ??
        null;

      if (targetTask) {
        const minutes =
          targetTask.estimatedMinutes && targetTask.estimatedMinutes >= 10
            ? Math.min(targetTask.estimatedMinutes, 90)
            : preferences.focusDefaultMinutes;

        await useTaskStore.getState().updateTask(targetTask.id, {
          lastAutoStartedDate: getLocalDateKey(new Date()),
          rescheduledStartAt: null,
          status: 'in_progress',
        });

        await startSession({
          taskId: targetTask.id,
          taskTitleSnapshot: targetTask.title,
          plannedDurationMinutes: minutes,
          checkpointEnabled: preferences.checkpointEnabled,
        });
        showToast(`Focus alarm started "${targetTask.title}".`, 'info');
      } else {
        await startSession({
          taskId: null,
          taskTitleSnapshot: 'Scheduled Focus Session',
          plannedDurationMinutes: preferences.focusDefaultMinutes,
          checkpointEnabled: preferences.checkpointEnabled,
        });
      }
    };

    void launchFromAlarm();
  }, [
    autoStart,
    alarmTaskId,
    activeSession,
    preferences.focusDefaultMinutes,
    preferences.checkpointEnabled,
    startSession,
    showToast,
  ]);

  const handleAutoCompleted = useCallback(() => {
    router.replace('/focus/completed');
  }, []);

  useFocusTicker(handleAutoCompleted);

  if (!activeSession) {
    return (
      <ScreenBackground variant="focus">
        <View style={[styles.emptyWrap, { paddingTop: insets.top + Spacing.xl }]}>
          <EmptyState
            icon="target"
            title="No active focus session"
            description="Start a new focus block from the setup screen to track your progress."
            actionLabel="Set up focus session"
            onAction={() => router.replace('/focus/setup')}
          />
          <SecondaryButton
            title="Back to Home"
            onPress={() => router.replace('/(tabs)/home')}
          />
        </View>
      </ScreenBackground>
    );
  }

  const isSessionRunning = activeSession.status === 'active';
  const isPaused = activeSession.status === 'paused';
  const selectedCount = blockerSettings.selectedApps.filter((a) => a.selected).length;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTogglePause = async () => {
    triggerHaptic();
    if (isSessionRunning) {
      await pauseSession();
    } else {
      await resumeSession();
    }
  };

  const handleTriggerCheckpoint = async () => {
    triggerHaptic();
    await enterCheckpoint();
    router.push('/focus/checkpoint');
  };

  const handleSimulateBlockedLaunch = async () => {
    await recordInterruption();
    await triggerSimulatedBlockedApp();
  };

  const handleSkipEarly = async () => {
    setEndModalVisible(false);
    const { rescheduledForIso, markedMissed } = await skipSessionAndReschedule();
    if (markedMissed || !rescheduledForIso) {
      showToast(
        'Due date reached — marked Missed with no further +1h retries.',
        'warning',
      );
    } else {
      const formattedNext = formatTimeShort(new Date(rescheduledForIso));
      showToast(
        `Marked Skipped — rescheduled for ${formattedNext} with a 5-min warning & alarm.`,
        'warning',
      );
    }
    router.replace('/focus/completed');
  };

  const minsLeft = Math.max(1, Math.ceil(remainingSeconds / 60));

  return (
    <ScreenBackground variant="focus">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Top Bar */}
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <AppIcon name="target" size={20} color="#ffffff" />
              <Text style={[Typography.h3, { color: '#ffffff' }]}>ProcrastiStop</Text>
            </View>
            <Pressable
              onPress={openEndModal}
              accessibilityLabel="End session"
              style={styles.closeBtn}
            >
              <AppIcon name="close" size={22} color="#ffffff" />
            </Pressable>
          </View>

          {/* Task Header */}
          <View style={styles.taskHeader}>
            <Text style={[Typography.eyebrow, styles.eyebrow]}>Focusing on</Text>
            <Text style={[Typography.h2, styles.taskTitle]} numberOfLines={2}>
              {activeSession.taskTitleSnapshot}
            </Text>
          </View>

          {/* Authoritative Timestamp Countdown Ring */}
          <View style={styles.timerContainer}>
            <FocusTimer
              remainingSeconds={remainingSeconds}
              plannedDurationMinutes={activeSession.plannedDurationMinutes}
              status={activeSession.status}
              size={252}
            />
          </View>

          <Text style={[Typography.body, styles.statusCaption]}>
            {isPaused
              ? 'Timer paused — your remaining seconds are safely persisted.'
              : 'Stay with your task. Switching apps will not lose your timer.'}
          </Text>

          {/* Status Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.statusChip}>
              <AppIcon name="shield" size={14} color="#8ee6b9" />
              <Text style={[Typography.small, styles.chipText]}>
                {runtimeStatus === 'monitoring'
                  ? `${selectedCount} apps restricted (sim)`
                  : `Blocker ${runtimeStatus}`}
              </Text>
            </View>

            <Pressable onPress={() => void handleTriggerCheckpoint()} style={styles.statusChip}>
              <AppIcon name="camera" size={14} color="#ffc83d" />
              <Text style={[Typography.small, styles.chipText]}>
                {preferences.checkpointEnabled ? 'Checkpoint ready' : 'Optional check-in'}
              </Text>
            </Pressable>
          </View>

          {/* Controls */}
          <View style={styles.controlsWrap}>
            <SessionControlBar
              isRunning={isSessionRunning}
              onTogglePause={() => void handleTogglePause()}
              onEndSession={openEndModal}
              onTriggerCheckpoint={() => void handleTriggerCheckpoint()}
              checkpointEnabled={preferences.checkpointEnabled}
            />
          </View>

          {/* Demo Simulated Blocker Trigger */}
          <Pressable
            onPress={() => void handleSimulateBlockedLaunch()}
            style={styles.simulateBtn}
          >
            <AppIcon name="phone" size={15} color="#ffc83d" />
            <Text style={[Typography.caption, styles.simulateText]}>
              Simulate Blocked App Launch
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Early Termination -> Skipped + 1-Hour Auto-Reschedule Modal */}
      <ConfirmationModal
        visible={endModalVisible}
        title="End this focus session?"
        description={`You still have ${minsLeft} minute${minsLeft === 1 ? '' : 's'} remaining. Ending early marks this session as Skipped and automatically reschedules it for ${nextRetryLabel} (1 hour later) with a 5-min warning and alarm.`}
        confirmLabel="Skip & Reschedule"
        cancelLabel="Keep Focusing"
        destructive
        icon="clock"
        onCancel={() => setEndModalVisible(false)}
        onConfirm={() => void handleSkipEarly()}
      />

      {/* Simulated Blocker Overlay Modal */}
      <SimulatedBlockerModal
        visible={Boolean(demoBlockedAppModal?.visible)}
        appName={demoBlockedAppModal?.appName ?? 'Instagram'}
        packageName={demoBlockedAppModal?.packageName ?? 'com.instagram.android'}
        remainingSeconds={remainingSeconds}
        taskTitle={activeSession.taskTitleSnapshot}
        allowEmergencyExit={blockerSettings.allowEmergencyExit}
        onReturnToFocus={dismissBlockedAppModal}
        onEmergencyExit={() => {
          dismissBlockedAppModal();
          void toggleBlockDuringFocus(false);
          showToast('Emergency exit used — restriction paused for this session.', 'warning');
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    flex: 1,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  taskHeader: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: 6,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.58)',
  },
  taskTitle: {
    color: '#ffffff',
    textAlign: 'center',
    maxWidth: 320,
  },
  timerContainer: {
    marginVertical: Spacing.xxl,
  },
  statusCaption: {
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    maxWidth: 300,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.88)',
  },
  controlsWrap: {
    marginTop: Spacing.xxxl,
    width: '100%',
  },
  simulateBtn: {
    marginTop: Spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 200, 61, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.35)',
  },
  simulateText: {
    color: '#ffc83d',
    fontWeight: '700',
  },
});
