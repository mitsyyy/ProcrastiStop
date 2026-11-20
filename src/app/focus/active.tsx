import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusTicker } from '@/hooks/useFocusTicker';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function ActiveFocusScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [endModalVisible, setEndModalVisible] = useState(false);

  const activeSession = useFocusStore((s) => s.activeSession);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const pauseSession = useFocusStore((s) => s.pauseSession);
  const resumeSession = useFocusStore((s) => s.resumeSession);
  const enterCheckpoint = useFocusStore((s) => s.enterCheckpoint);
  const recordInterruption = useFocusStore((s) => s.recordInterruption);
  const completeSession = useFocusStore((s) => s.completeSession);
  const cancelSession = useFocusStore((s) => s.cancelSession);

  const blockerSettings = useBlockerStore((s) => s.settings);
  const runtimeStatus = useBlockerStore((s) => s.runtimeStatus);
  const demoBlockedAppModal = useBlockerStore((s) => s.demoBlockedAppModal);
  const triggerSimulatedBlockedApp = useBlockerStore((s) => s.triggerSimulatedBlockedApp);
  const dismissBlockedAppModal = useBlockerStore((s) => s.dismissBlockedAppModal);
  const toggleBlockDuringFocus = useBlockerStore((s) => s.toggleBlockDuringFocus);

  const checkpointEnabled = useSettingsStore((s) => s.preferences.checkpointEnabled);
  const showToast = useSettingsStore((s) => s.showToast);

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

  const isPaused = activeSession.status === 'paused';
  const selectedCount = blockerSettings.selectedApps.filter((a) => a.selected).length;

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTogglePause = async () => {
    triggerHaptic();
    if (isPaused) {
      await resumeSession();
    } else {
      await pauseSession();
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

  const handleCompleteEarly = async () => {
    setEndModalVisible(false);
    await completeSession();
    router.replace('/focus/completed');
  };

  const handleCancelSession = async () => {
    setEndModalVisible(false);
    await cancelSession();
    showToast('Focus session cancelled. Partial progress saved to history.', 'info');
    router.replace('/(tabs)/home');
  };

  const minsLeft = Math.ceil(remainingSeconds / 60);

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
              onPress={() => setEndModalVisible(true)}
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
                {checkpointEnabled ? 'Checkpoint ready' : 'Optional check-in'}
              </Text>
            </Pressable>
          </View>

          {/* Controls */}
          <View style={styles.controlsWrap}>
            <SessionControlBar
              isPaused={isPaused}
              onTogglePause={() => void handleTogglePause()}
              onEndSession={() => setEndModalVisible(true)}
              onTriggerCheckpoint={() => void handleTriggerCheckpoint()}
              checkpointEnabled={checkpointEnabled}
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

      {/* End / Cancel Session Choice Modal */}
      <ConfirmationModal
        visible={endModalVisible}
        title="End this focus session?"
        description={`You still have ${minsLeft} minute${minsLeft === 1 ? '' : 's'} remaining. Save completed time or cancel this session.`}
        confirmLabel="Complete & save"
        cancelLabel="Keep focusing"
        onCancel={() => setEndModalVisible(false)}
        onConfirm={() => void handleCompleteEarly()}
      />

      {/* Extra Cancel Option Modal Footer inside custom overlay if user wants pure cancel */}
      {endModalVisible ? (
        <View style={[styles.cancelStrip, { bottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <Pressable
            onPress={() => void handleCancelSession()}
            style={[
              styles.cancelPill,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.danger },
            ]}
          >
            <Text style={[Typography.caption, { color: palette.dangerText, fontWeight: '700' }]}>
              Or discard & mark session cancelled
            </Text>
          </Pressable>
        </View>
      ) : null}

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
  cancelStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  cancelPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
});
