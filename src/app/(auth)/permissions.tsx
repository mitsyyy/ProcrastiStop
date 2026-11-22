import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  type CriticalPermissionsSnapshot,
  getCriticalPermissionsSnapshot,
  openDisplayOverAppsSettings,
  openExactAlarmSettings,
  openFullScreenAlarmSettings,
} from '@/services/native/focusOverlayPermissions';
import {
  openAppSystemSettings,
  requestNotificationPermission,
  syncScheduledPreSessionAndNudgeNotifications,
} from '@/services/notifications/notificationService';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export default function PermissionOnboardingScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [cameraPerm, requestCameraPermission, getCameraPermission] = useCameraPermissions();

  const tasks = useTaskStore((s) => s.tasks);
  const preferences = useSettingsStore((s) => s.preferences);
  const activeSession = useFocusStore((s) => s.activeSession);
  const completePermissionOnboarding = useSettingsStore((s) => s.completePermissionOnboarding);
  const showToast = useSettingsStore((s) => s.showToast);

  const [snapshot, setSnapshot] = useState<CriticalPermissionsSnapshot>({
    notifications: { status: 'undetermined', canAskAgain: true },
    overlay: Platform.OS === 'android' ? 'undetermined' : 'unavailable',
    exactAlarms: Platform.OS === 'android' ? 'undetermined' : 'unavailable',
    fullScreenIntent: Platform.OS === 'android' ? 'undetermined' : 'unavailable',
    nativeBridgeAvailable: false,
  });

  const refreshPermissions = useCallback(async () => {
    const [next] = await Promise.all([
      getCriticalPermissionsSnapshot(),
      getCameraPermission(),
    ]);
    setSnapshot(next);
    if (next.notifications.status === 'granted') {
      void syncScheduledPreSessionAndNudgeNotifications(tasks, preferences, activeSession);
    }
  }, [tasks, preferences, activeSession, getCameraPermission]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void refreshPermissions();
    }, 0);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshPermissions();
      }
    });
    return () => {
      clearTimeout(initTimer);
      sub.remove();
    };
  }, [refreshPermissions]);

  const notifGranted = snapshot.notifications.status === 'granted';
  const overlayGranted =
    Platform.OS !== 'android' || snapshot.overlay === 'granted';
  const cameraGranted = Boolean(cameraPerm?.granted);
  const allCoreGranted = notifGranted && overlayGranted && cameraGranted;
  const exactAlarmNeedsAction =
    Platform.OS === 'android' && snapshot.exactAlarms === 'denied';
  const fullScreenNeedsAction =
    Platform.OS === 'android' && snapshot.fullScreenIntent === 'denied';

  const handleRequestNotifications = async () => {
    if (snapshot.notifications.status === 'denied' && !snapshot.notifications.canAskAgain) {
      await openAppSystemSettings();
      return;
    }
    const result = await requestNotificationPermission();
    await refreshPermissions();
    if (result.status === 'granted') {
      showToast('Notifications enabled — exact pre-session reminders armed.', 'success');
    } else if (result.status !== 'unavailable') {
      showToast('Enable notifications in Android Settings so alerts fire on time.', 'warning');
    }
  };

  const handleOpenOverlaySettings = async () => {
    await openDisplayOverAppsSettings();
  };

  const handleRequestCamera = async () => {
    if (cameraPerm && !cameraPerm.granted && !cameraPerm.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    const res = await requestCameraPermission();
    await refreshPermissions();
    if (res.granted) {
      showToast('Camera access enabled for hands-free offline AI verification.', 'success');
    }
  };

  const handleContinue = async () => {
    await completePermissionOnboarding();
    if (notifGranted) {
      void syncScheduledPreSessionAndNudgeNotifications(tasks, preferences, activeSession);
    }
    router.replace('/(tabs)/home');
  };

  return (
    <ScreenBackground variant="home">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={[styles.heroIcon, { backgroundColor: palette.sageTint }]}>
              <AppIcon name="shield" size={28} color={palette.accentMint} />
            </View>
            <Text style={[Typography.eyebrow, { color: palette.accentMint }]}>
              Required Device Setup
            </Text>
            <Text style={[Typography.h1, styles.title, { color: palette.text }]}>
              Enable focus alarms & overlay launch
            </Text>
            <Text style={[Typography.body, styles.subtitle, { color: palette.textMuted }]}>
              Grant these two Android permissions so pre-session warnings fire in the background and
              scheduled focus blocks automatically open over distracting apps or a locked screen.
            </Text>
          </View>

          {/* Permission 1: Notifications (POST_NOTIFICATIONS) */}
          <Card style={styles.permCard}>
            <View style={styles.permTopRow}>
              <View
                style={[
                  styles.permIconBox,
                  {
                    backgroundColor: notifGranted ? palette.successSoft : palette.sageTint,
                  },
                ]}
              >
                <AppIcon
                  name={notifGranted ? 'check' : 'bell'}
                  size={20}
                  color={notifGranted ? palette.successText : palette.accentMint}
                />
              </View>
              <View style={styles.permCopy}>
                <View style={styles.titleStatusRow}>
                  <Text style={[Typography.h3, { color: palette.text, flex: 1 }]}>
                    1. Notifications & Reminders
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: notifGranted
                          ? palette.successSoft
                          : palette.warningSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: notifGranted ? palette.successText : palette.warningText,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {notifGranted ? 'Granted' : 'Required'}
                    </Text>
                  </View>
                </View>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                  Delivers proportional pre-session nudges, 5-minute warnings, and focus completion
                  alerts even while the app is closed.
                </Text>
              </View>
            </View>

            {!notifGranted ? (
              <PrimaryButton
                title={
                  snapshot.notifications.status === 'denied' &&
                  !snapshot.notifications.canAskAgain
                    ? 'Open Notification Settings'
                    : 'Allow Notifications'
                }
                icon="bell"
                tone="emerald"
                compact
                onPress={() => void handleRequestNotifications()}
              />
            ) : null}
          </Card>

          {/* Permission 2: Display Over Other Apps (SYSTEM_ALERT_WINDOW) */}
          <Card style={styles.permCard}>
            <View style={styles.permTopRow}>
              <View
                style={[
                  styles.permIconBox,
                  {
                    backgroundColor: overlayGranted ? palette.successSoft : palette.warningSoft,
                  },
                ]}
              >
                <AppIcon
                  name={overlayGranted ? 'check' : 'phone'}
                  size={20}
                  color={overlayGranted ? palette.successText : palette.warningText}
                />
              </View>
              <View style={styles.permCopy}>
                <View style={styles.titleStatusRow}>
                  <Text style={[Typography.h3, { color: palette.text, flex: 1 }]}>
                    2. Display Over Other Apps
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          Platform.OS !== 'android'
                            ? palette.surfaceMuted
                            : overlayGranted
                              ? palette.successSoft
                              : palette.warningSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.small,
                        {
                          color:
                            Platform.OS !== 'android'
                              ? palette.textMuted
                              : overlayGranted
                                ? palette.successText
                                : palette.warningText,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {Platform.OS !== 'android'
                        ? 'Android only'
                        : overlayGranted
                          ? 'Granted'
                          : 'Required'}
                    </Text>
                  </View>
                </View>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                  Allows ProcrastiStop to automatically pop open the active focus timer right over
                  whatever app you are using when your scheduled start time arrives.
                </Text>
              </View>
            </View>

            {Platform.OS === 'android' && !overlayGranted ? (
              <PrimaryButton
                title="Allow Display Over Other Apps"
                icon="shield"
                tone="energy"
                compact
                onPress={() => void handleOpenOverlaySettings()}
              />
            ) : null}
          </Card>

          {/* Permission 3: Camera Access (Hands-Free Offline AI Gate) */}
          <Card style={styles.permCard}>
            <View style={styles.permTopRow}>
              <View
                style={[
                  styles.permIconBox,
                  {
                    backgroundColor: cameraGranted ? palette.successSoft : palette.sageTint,
                  },
                ]}
              >
                <AppIcon
                  name={cameraGranted ? 'check' : 'camera'}
                  size={20}
                  color={cameraGranted ? palette.successText : palette.accentMint}
                />
              </View>
              <View style={styles.permCopy}>
                <View style={styles.titleStatusRow}>
                  <Text style={[Typography.h3, { color: palette.text, flex: 1 }]}>
                    3. Camera (AI Gate)
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: cameraGranted
                          ? palette.successSoft
                          : palette.warningSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: cameraGranted ? palette.successText : palette.warningText,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {cameraGranted ? 'Granted' : 'Required'}
                    </Text>
                  </View>
                </View>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                  Powers hands-free offline Google ML Kit hover verification before sessions start.
                  Frames are processed in-memory and never saved (imagePath: null).
                </Text>
              </View>
            </View>

            {!cameraGranted ? (
              <PrimaryButton
                title={
                  cameraPerm && !cameraPerm.canAskAgain
                    ? 'Open Camera Settings'
                    : 'Allow Camera Access'
                }
                icon="camera"
                tone="emerald"
                compact
                onPress={() => void handleRequestCamera()}
              />
            ) : null}
          </Card>

          {/* Extra Android 12+/14+ Alarm & Full-Screen Verification Row (only shown if restricted) */}
          {exactAlarmNeedsAction || fullScreenNeedsAction ? (
            <Card style={styles.permCard}>
              <Text style={[Typography.bodySemiBold, { color: palette.warningText }]}>
                Additional Android Alarm Permissions
              </Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>
                Your device currently restricts exact background alarms or lock-screen wake-ups.
                Enable them below so Doze mode never delays your focus start.
              </Text>
              <View style={styles.extraActions}>
                {exactAlarmNeedsAction ? (
                  <SecondaryButton
                    title="Enable Exact Alarms"
                    compact
                    onPress={() => void openExactAlarmSettings()}
                    style={styles.flexOne}
                  />
                ) : null}
                {fullScreenNeedsAction ? (
                  <SecondaryButton
                    title="Allow Lock-Screen Alarms"
                    compact
                    onPress={() => void openFullScreenAlarmSettings()}
                    style={styles.flexOne}
                  />
                ) : null}
              </View>
            </Card>
          ) : null}

          {/* Live Status Refresh Note */}
          <Pressable onPress={() => void refreshPermissions()} style={styles.refreshRow}>
            <AppIcon name="refresh" size={14} color={palette.accentMint} />
            <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '600' }]}>
              Status verifies automatically when returning from Settings · Tap to re-check
            </Text>
          </Pressable>

          {/* Footer CTA */}
          <View style={styles.footerActions}>
            <PrimaryButton
              title={allCoreGranted ? 'Continue to Dashboard' : 'Continue to Dashboard'}
              tone={allCoreGranted ? 'emerald' : 'energy'}
              onPress={() => void handleContinue()}
            />
            {!allCoreGranted ? (
              <SecondaryButton
                title="Skip for now (configure later in Focus tab)"
                variant="ghost"
                compact
                fullWidth
                onPress={() => void handleContinue()}
              />
            ) : null}
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
    gap: Spacing.lg,
  },
  headerBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 340,
  },
  permCard: {
    gap: Spacing.md,
  },
  permTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  permIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCopy: {
    flex: 1,
    gap: 6,
  },
  titleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  extraActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flexOne: {
    flex: 1,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  footerActions: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
});
