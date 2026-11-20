import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSelectionItem } from '@/components/blocker/AppSelectionItem';
import { BlockerStatusCard } from '@/components/blocker/BlockerStatusCard';
import { SimulatedBlockerModal } from '@/components/blocker/SimulatedBlockerModal';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAnalytics } from '@/features/analytics/useAnalytics';
import { BLOCKER_PERMISSION_DETAILS } from '@/features/app-blocker/blockerMeta';
import { useReminders } from '@/features/notifications/useReminders';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusTicker } from '@/hooks/useFocusTicker';
import {
  getNotificationPermissionState,
  getScheduledNotificationsCount,
  type NotificationPermissionState,
  type NotificationSyncSummary,
  openAppSystemSettings,
  requestNotificationPermission,
  scheduleReminderNotification,
  sendTestLocalNotification,
  sendTestPreSessionWarning,
  syncScheduledPreSessionAndNudgeNotifications,
} from '@/services/notifications/notificationService';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import { formatCountdown, formatFullDateTime, formatMinutesAsDuration } from '@/utils/date';

export default function FocusHubScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [notifPerm, setNotifPerm] = useState<NotificationPermissionState>({
    status: 'undetermined',
    canAskAgain: true,
  });
  const [scheduledCount, setScheduledCount] = useState(0);
  const [syncSummary, setSyncSummary] = useState<NotificationSyncSummary | null>(null);

  const tasks = useTaskStore((s) => s.tasks);
  const activeSession = useFocusStore((s) => s.activeSession);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);
  const preferences = useSettingsStore((s) => s.preferences);
  const showToast = useSettingsStore((s) => s.showToast);

  useEffect(() => {
    let active = true;
    const refreshNotificationState = async () => {
      const [perm, summary] = await Promise.all([
        getNotificationPermissionState(),
        syncScheduledPreSessionAndNudgeNotifications(tasks, preferences, activeSession),
      ]);
      const count = await getScheduledNotificationsCount();
      if (active) {
        setNotifPerm(perm);
        setSyncSummary(summary);
        setScheduledCount(count);
      }
    };
    void refreshNotificationState();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshNotificationState();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [tasks, preferences, activeSession]);

  useFocusTicker(() => {
    router.push('/focus/completed');
  });

  const blockerSettings = useBlockerStore((s) => s.settings);
  const permissions = useBlockerStore((s) => s.permissions);
  const runtimeStatus = useBlockerStore((s) => s.runtimeStatus);
  const demoBlockedAppModal = useBlockerStore((s) => s.demoBlockedAppModal);
  const toggleBlockerEnabled = useBlockerStore((s) => s.toggleBlockerEnabled);
  const toggleBlockDuringFocus = useBlockerStore((s) => s.toggleBlockDuringFocus);
  const toggleEmergencyExit = useBlockerStore((s) => s.toggleEmergencyExit);
  const toggleAppSelection = useBlockerStore((s) => s.toggleAppSelection);
  const requestPermission = useBlockerStore((s) => s.requestPermission);
  const cyclePermissionDemoState = useBlockerStore((s) => s.cyclePermissionDemoState);
  const triggerSimulatedBlockedApp = useBlockerStore((s) => s.triggerSimulatedBlockedApp);
  const dismissBlockedAppModal = useBlockerStore((s) => s.dismissBlockedAppModal);

  const { summary } = useAnalytics();
  const reminders = useReminders();

  const nextTaskTitle = syncSummary?.nextTaskTitle ?? 'Scheduled Focus Block';

  const selectedCount = blockerSettings.selectedApps.filter((a) => a.selected).length;
  const hasLiveSession =
    activeSession?.status === 'active' || activeSession?.status === 'paused';

  return (
    <ScreenBackground variant="surface">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xs,
            paddingBottom: insets.bottom + Layout.floatingNavHeight + Spacing.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <AppHeader
            title="Focus & Stats"
            subtitle="Run deep-work sessions, review focus stats, and manage reminders."
          />

          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityLabel="View full focus analytics"
            style={[
              styles.statsStrip,
              { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
            ]}
          >
            <View style={[styles.statCell, { borderRightColor: palette.borderSubtle }]}>
              <Text style={[Typography.h3, { color: palette.text }]}>
                {formatMinutesAsDuration(summary?.todayFocusedMinutes ?? 0)}
              </Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Today</Text>
            </View>
            <View style={[styles.statCell, { borderRightColor: palette.borderSubtle }]}>
              <Text style={[Typography.h3, { color: palette.text }]}>
                {formatMinutesAsDuration(summary?.weekFocusedMinutes ?? 0)}
              </Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>This week</Text>
            </View>
            <View style={styles.statLastCell}>
              <Text style={[Typography.h3, { color: palette.accentMint }]}>
                {summary?.currentStreakDays ?? 0}d
              </Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Streak</Text>
            </View>
          </Pressable>

          {/* Session Entry Card */}
          <Card variant="elevated" style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={[styles.entryIcon, { backgroundColor: palette.sageTint }]}>
                <AppIcon name="target" size={22} color={palette.accentMint} />
              </View>
              <View style={styles.entryCopy}>
                <Text style={[Typography.eyebrow, { color: palette.accentMint }]}>
                  {hasLiveSession
                    ? activeSession?.status === 'paused'
                      ? 'Paused session'
                      : 'Active session'
                    : 'Focus timer'}
                </Text>
                <Text style={[Typography.h3, { color: palette.text }]} numberOfLines={1}>
                  {hasLiveSession && activeSession
                    ? `${activeSession.taskTitleSnapshot} · ${formatCountdown(remainingSeconds)}`
                    : `${preferences.focusDefaultMinutes} min default focus block`}
                </Text>
              </View>
            </View>

            <View style={styles.entryActions}>
              {hasLiveSession ? (
                <PrimaryButton
                  title="Open Active Session"
                  icon="play"
                  tone="energy"
                  onPress={() => router.push('/focus/active')}
                />
              ) : (
                <PrimaryButton
                  title="Configure & Start Focus"
                  icon="play"
                  tone="energy"
                  onPress={() => router.push('/focus/setup')}
                />
              )}
            </View>
          </Card>

          {/* Simulated App Blocker Section */}
          <View style={styles.section}>
            <SectionHeader
              title="Android App Blocker"
              eyebrow="Frontend Simulation · Stage 1"
              rightMeta={`${selectedCount} selected`}
            />

            <View
              style={[
                styles.honestBanner,
                { backgroundColor: palette.warningSoft, borderColor: palette.warning },
              ]}
            >
              <AppIcon name="shield" size={18} color={palette.warningText} />
              <Text style={[Typography.small, { color: palette.textSecondary, flex: 1 }]}>
                Expo JavaScript cannot block other Android apps at the OS level. This module
                persists your blocked-app selections and simulates Android permissions and the
                interception overlay before Stage 2 Kotlin integration.
              </Text>
            </View>

            <Card style={styles.controlsCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Enable distraction guard
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Status: {runtimeStatus} (simulated)
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.enabled}
                  onValueChange={(v) => void toggleBlockerEnabled(v)}
                />
              </View>

              <Divider />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Restrict automatically during focus
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Activates when a focus session starts
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.blockDuringFocus}
                  disabled={!blockerSettings.enabled}
                  onValueChange={(v) => void toggleBlockDuringFocus(v)}
                />
              </View>

              <Divider />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Allow emergency exit
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Include an override option on the shield card
                  </Text>
                </View>
                <ToggleSwitch
                  value={blockerSettings.allowEmergencyExit}
                  disabled={!blockerSettings.enabled}
                  onValueChange={(v) => void toggleEmergencyExit(v)}
                />
              </View>
            </Card>

            <View style={styles.subSection}>
              <Text style={[Typography.label, { color: palette.textSecondary, marginBottom: 8 }]}>
                Selected Android Apps
              </Text>
              <Card noPadding>
                <View style={styles.appListPad}>
                  {blockerSettings.selectedApps.map((app, idx, arr) => (
                    <AppSelectionItem
                      key={app.packageName}
                      item={app}
                      disabled={!blockerSettings.enabled}
                      isLast={idx === arr.length - 1}
                      onToggle={() => void toggleAppSelection(app.packageName)}
                    />
                  ))}
                </View>
              </Card>

              <SecondaryButton
                title="Preview Simulated Blocker Overlay"
                icon="shield"
                onPress={() => void triggerSimulatedBlockedApp()}
                fullWidth
                style={styles.previewOverlayBtn}
              />
            </View>

            <View style={styles.subSection}>
              <Text style={[Typography.label, { color: palette.textSecondary, marginBottom: 8 }]}>
                Android Permission Status (Simulated)
              </Text>
              <View style={styles.permStack}>
                {BLOCKER_PERMISSION_DETAILS.map((meta) => (
                  <BlockerStatusCard
                    key={meta.kind}
                    title={meta.title}
                    description={meta.description}
                    settingPath={meta.androidSettingLabel}
                    status={permissions[meta.kind]}
                    onRequest={() => void requestPermission(meta.kind)}
                    onCycleDemoState={() => void cyclePermissionDemoState(meta.kind)}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Local Android Notifications & Reminder Previews */}
          <View style={styles.section}>
            <SectionHeader
              title="Notifications & Reminders"
              eyebrow="Local Device Alerts"
              rightMeta={
                notifPerm.status === 'granted'
                  ? 'Allowed'
                  : notifPerm.status === 'denied'
                    ? 'Denied'
                    : notifPerm.status === 'unavailable'
                      ? 'Device only'
                      : 'Permission needed'
              }
            />

            <Card style={styles.notifControlsCard}>
              <View style={styles.notifStatusRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Device notification access
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    {notifPerm.status === 'granted'
                      ? `${scheduledCount} OS alert${scheduledCount === 1 ? '' : 's'} queued (high-priority channel active).`
                      : notifPerm.status === 'denied' && !notifPerm.canAskAgain
                        ? 'Disabled in Android Settings. Open Settings to re-enable.'
                        : 'Allow local notifications to receive 5-min warnings and daily nudges.'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.permPill,
                    {
                      backgroundColor:
                        notifPerm.status === 'granted'
                          ? palette.successSoft
                          : notifPerm.status === 'denied'
                            ? palette.dangerSoft
                            : palette.warningSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      Typography.small,
                      {
                        color:
                          notifPerm.status === 'granted'
                            ? palette.successText
                            : notifPerm.status === 'denied'
                              ? palette.dangerText
                              : palette.warningText,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {notifPerm.status === 'granted'
                      ? 'Granted'
                      : notifPerm.status === 'denied'
                        ? 'Denied'
                        : notifPerm.status === 'unavailable'
                          ? 'Unavailable'
                          : 'Not asked'}
                  </Text>
                </View>
              </View>

              {syncSummary?.nextPreSessionAt ? (
                <View
                  style={[
                    styles.preSessionBox,
                    { backgroundColor: palette.sageTint, borderColor: palette.border },
                  ]}
                >
                  <AppIcon name="bell" size={16} color={palette.accentMint} />
                  <View style={styles.switchCopy}>
                    <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
                      Next {preferences.remindBeforeSessionMinutes}-min warning:{' '}
                      {formatFullDateTime(syncSummary.nextPreSessionAt)}
                    </Text>
                    <Text style={[Typography.small, { color: palette.textMuted }]}>
                      For &ldquo;{nextTaskTitle}&rdquo; · {syncSummary.preSessionCount} pre-session &{' '}
                      {syncSummary.nudgeCount} daily nudges queued
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.notifActionsRow}>
                {notifPerm.status !== 'granted' ? (
                  <PrimaryButton
                    title={
                      notifPerm.status === 'denied' && !notifPerm.canAskAgain
                        ? 'Open App Settings'
                        : 'Allow Notifications'
                    }
                    icon="bell"
                    tone="emerald"
                    fullWidth={false}
                    style={styles.flexOne}
                    onPress={() => {
                      if (notifPerm.status === 'denied' && !notifPerm.canAskAgain) {
                        void openAppSystemSettings();
                      } else {
                        void requestNotificationPermission().then(async (next) => {
                          setNotifPerm(next);
                          if (next.status === 'granted') {
                            const synced = await syncScheduledPreSessionAndNudgeNotifications(
                              tasks,
                              preferences,
                              activeSession,
                            );
                            const count = await getScheduledNotificationsCount();
                            setSyncSummary(synced);
                            setScheduledCount(count);
                            showToast(
                              `Notifications enabled — ${synced.scheduledCount} alerts scheduled.`,
                              'success',
                            );
                          } else {
                            showToast('Notification permission not granted.', 'warning');
                          }
                        });
                      }
                    }}
                  />
                ) : (
                  <PrimaryButton
                    title={`Test ${preferences.remindBeforeSessionMinutes}m Warning (3s)`}
                    icon="bell"
                    tone="emerald"
                    fullWidth={false}
                    style={styles.flexOne}
                    onPress={() => {
                      void sendTestPreSessionWarning(
                        nextTaskTitle,
                        preferences.remindBeforeSessionMinutes,
                        3,
                      ).then((res) => {
                        setNotifPerm({
                          status: res.permissionStatus,
                          canAskAgain: res.canAskAgain,
                        });
                        showToast(
                          res.scheduled
                            ? `${preferences.remindBeforeSessionMinutes}-min warning preview arriving in 3 seconds.`
                            : res.reason ?? 'Unable to schedule notification.',
                          res.scheduled ? 'success' : 'warning',
                        );
                      });
                    }}
                  />
                )}

                <SecondaryButton
                  title="Send Test Alert (3s)"
                  icon="bell"
                  style={styles.flexOne}
                  onPress={() => {
                    void sendTestLocalNotification(3).then((res) => {
                      setNotifPerm({
                        status: res.permissionStatus,
                        canAskAgain: res.canAskAgain,
                      });
                      if (res.scheduled) {
                        showToast(
                          'Test notification scheduled — it will arrive in 3 seconds.',
                          'success',
                        );
                      } else {
                        showToast(res.reason ?? 'Unable to schedule notification.', 'warning');
                      }
                    });
                  }}
                />
              </View>
            </Card>

            <Card style={styles.reminderCard}>
              {reminders.length > 0 ? (
                <View style={styles.remList}>
                  {reminders.map((rem, idx) => (
                    <Pressable
                      key={rem.id}
                      onPress={() => {
                        void scheduleReminderNotification({
                          title: rem.title,
                          body: rem.body,
                          delaySeconds: 4,
                          route: rem.taskId ? `/tasks/${rem.taskId}` : '/(tabs)/focus',
                        }).then((res) => {
                          setNotifPerm({
                            status: res.permissionStatus,
                            canAskAgain: res.canAskAgain,
                          });
                          showToast(
                            res.scheduled
                              ? `Scheduled "${rem.title}" alert in 4 seconds.`
                              : res.reason ?? 'Enable notifications to schedule alerts.',
                            res.scheduled ? 'success' : 'warning',
                          );
                        });
                      }}
                      style={[
                        styles.remRow,
                        idx < reminders.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: palette.borderSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.remBadge,
                          {
                            backgroundColor:
                              rem.kind === 'overdue'
                                ? palette.dangerSoft
                                : rem.kind === 'deadline'
                                  ? palette.warningSoft
                                  : palette.sageTint,
                          },
                        ]}
                      >
                        <AppIcon
                          name={rem.kind === 'session' || rem.kind === 'nudge' ? 'bell' : 'clock'}
                          size={16}
                          color={
                            rem.kind === 'overdue'
                              ? palette.dangerText
                              : rem.kind === 'deadline'
                                ? palette.warningText
                                : palette.accentMint
                          }
                        />
                      </View>
                      <View style={styles.remCopy}>
                        <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                          {rem.title}
                        </Text>
                        <Text style={[Typography.caption, { color: palette.textMuted }]}>
                          {rem.body}
                        </Text>
                        <Text style={[Typography.small, { color: palette.accentMint, marginTop: 2 }]}>
                          Tap to test in 4s · {rem.scheduledLabel}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                  Reminders are currently disabled or no urgent tasks need alerts.
                </Text>
              )}
            </Card>
          </View>
        </View>
      </ScrollView>

      <SimulatedBlockerModal
        visible={Boolean(demoBlockedAppModal?.visible)}
        appName={demoBlockedAppModal?.appName ?? 'Instagram'}
        packageName={demoBlockedAppModal?.packageName ?? 'com.instagram.android'}
        remainingSeconds={
          hasLiveSession ? remainingSeconds : preferences.focusDefaultMinutes * 60
        }
        taskTitle={activeSession?.taskTitleSnapshot ?? 'Sample Focus Session'}
        allowEmergencyExit={blockerSettings.allowEmergencyExit}
        onReturnToFocus={dismissBlockedAppModal}
        onEmergencyExit={() => {
          dismissBlockedAppModal();
          showToast('Emergency exit simulated — restriction paused.', 'warning');
        }}
      />
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
  statsStrip: {
    flexDirection: 'row',
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  statLastCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  entryCard: {
    gap: Spacing.lg,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  entryActions: {
    width: '100%',
  },
  section: {
    marginTop: Spacing.xxl,
  },
  honestBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  controlsCard: {
    gap: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  subSection: {
    marginTop: Spacing.lg,
  },
  appListPad: {
    paddingHorizontal: Spacing.lg,
  },
  previewOverlayBtn: {
    marginTop: Spacing.md,
  },
  permStack: {
    gap: Spacing.md,
  },
  remList: {
    gap: Spacing.xs,
  },
  remRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  remBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remCopy: {
    flex: 1,
    gap: 2,
  },
  notifControlsCard: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  notifStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  permPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  notifActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  preSessionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  reminderCard: {
    marginTop: 0,
  },
  flexOne: {
    flex: 1,
  },
});
