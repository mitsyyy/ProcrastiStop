import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusTimer } from '@/components/focus/FocusTimer';
import { SessionControlBar } from '@/components/focus/SessionControlBar';
import { AppIcon } from '@/components/ui/AppIcon';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useFocusTicker } from '@/hooks/useFocusTicker';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function ActiveFocusScreen() {
  const insets = useSafeAreaInsets();
  const [endModalVisible, setEndModalVisible] = useState(false);

  const activeSession = useFocusStore((s) => s.activeSession);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const pauseSession = useFocusStore((s) => s.pauseSession);
  const resumeSession = useFocusStore((s) => s.resumeSession);
  const enterCheckpoint = useFocusStore((s) => s.enterCheckpoint);
  const completeSession = useFocusStore((s) => s.completeSession);
  const checkpointEnabled = useSettingsStore((s) => s.preferences.checkpointEnabled);

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
          <SecondaryButton title="Back to Home" onPress={() => router.replace('/(tabs)/home')} />
        </View>
      </ScreenBackground>
    );
  }

  const isPaused = activeSession.status === 'paused';
  const minsLeft = Math.ceil(remainingSeconds / 60);

  return (
    <ScreenBackground variant="focus">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <AppIcon name="target" size={20} color="#ffffff" />
              <Text style={[Typography.h3, { color: '#ffffff' }]}>ProcrastiStop</Text>
            </View>
            <Pressable onPress={() => setEndModalVisible(true)} style={styles.closeBtn}>
              <AppIcon name="close" size={22} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.taskHeader}>
            <Text style={[Typography.eyebrow, styles.eyebrow]}>Focusing on</Text>
            <Text style={[Typography.h2, styles.taskTitle]} numberOfLines={2}>
              {activeSession.taskTitleSnapshot}
            </Text>
          </View>

          <View style={styles.timerContainer}>
            <FocusTimer
              remainingSeconds={remainingSeconds}
              plannedDurationMinutes={activeSession.plannedDurationMinutes}
              status={activeSession.status}
              size={252}
            />
          </View>

          <View style={styles.controlsWrap}>
            <SessionControlBar
              isPaused={isPaused}
              onTogglePause={() => void (isPaused ? resumeSession() : pauseSession())}
              onEndSession={() => setEndModalVisible(true)}
              onTriggerCheckpoint={() => {
                void enterCheckpoint().then(() => router.push('/focus/checkpoint'));
              }}
              checkpointEnabled={checkpointEnabled}
            />
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={endModalVisible}
        title="End this focus session?"
        description={`You still have ${minsLeft} minute${minsLeft === 1 ? '' : 's'} remaining.`}
        confirmLabel="Complete & save"
        cancelLabel="Keep focusing"
        onCancel={() => setEndModalVisible(false)}
        onConfirm={() => {
          setEndModalVisible(false);
          void completeSession().then(() => router.replace('/focus/completed'));
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth, flex: 1, alignItems: 'center' },
  topRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  taskHeader: { alignItems: 'center', marginTop: Spacing.xxl, gap: 6 },
  eyebrow: { color: 'rgba(255,255,255,0.58)' },
  taskTitle: { color: '#ffffff', textAlign: 'center', maxWidth: 320 },
  timerContainer: { marginVertical: Spacing.xxl },
  controlsWrap: { marginTop: Spacing.xxxl, width: '100%' },
});
