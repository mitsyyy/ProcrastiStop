import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockerStatusCard } from '@/components/blocker/BlockerStatusCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SelectField } from '@/components/ui/SelectField';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  FOCUS_DURATION_PRESETS,
  LONG_BREAK_OPTIONS,
  REMINDER_LEAD_OPTIONS,
  SHORT_BREAK_OPTIONS,
} from '@/constants/categories';
import { Layout, Radii, Spacing, Typography, type ThemeMode } from '@/constants/theme';
import { useAnalytics } from '@/features/analytics/useAnalytics';
import { BLOCKER_PERMISSION_DETAILS } from '@/features/app-blocker/blockerMeta';
import { useDemoReset } from '@/hooks/useAppHydration';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  openAppSystemSettings,
  requestNotificationPermission,
  sendTestLocalNotification,
} from '@/services/notifications/notificationService';
import { useBlockerStore } from '@/store/blockerStore';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatMinutesAsDuration, formatShortDate } from '@/utils/date';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export default function ProfileScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const user = useSettingsStore((s) => s.user);
  const preferences = useSettingsStore((s) => s.preferences);
  const updatePreferences = useSettingsStore((s) => s.updatePreferences);
  const signOut = useSettingsStore((s) => s.signOut);
  const showToast = useSettingsStore((s) => s.showToast);

  const sessions = useFocusStore((s) => s.sessions);
  const permissions = useBlockerStore((s) => s.permissions);
  const requestPermission = useBlockerStore((s) => s.requestPermission);
  const cyclePermissionDemoState = useBlockerStore((s) => s.cyclePermissionDemoState);

  const { summary } = useAnalytics();
  const resetDemoData = useDemoReset();

  const maxDailyMins = Math.max(
    45,
    ...(summary?.dailyBreakdown.map((d) => d.minutes) ?? [60]),
  );
  const maxCategoryMins = Math.max(
    30,
    ...(summary?.categoryBreakdown.map((c) => c.minutes) ?? [45]),
  );

  const handleSignOut = async () => {
    await signOut();
    showToast('Signed out locally.', 'info');
    router.replace('/(auth)/login');
  };

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
            title="Profile & Progress"
            subtitle="Your focus history, analytics, and preferences."
          />

          {/* Profile Identity Card */}
          <LinearGradient
            colors={
              palette.mode === 'dark'
                ? ['rgba(41, 148, 97, 0.56)', 'rgba(255, 255, 255, 0.08)']
                : ['#315b46', '#244536']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, { borderColor: palette.border }]}
          >
            <View style={styles.avatar}>
              <Text style={[Typography.h3, { color: '#ffffff' }]}>
                {user?.initials ?? 'FL'}
              </Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={[Typography.h3, { color: '#ffffff' }]}>
                {user?.fullName ?? 'Demo Focus User'}
              </Text>
              <Text style={[Typography.small, { color: 'rgba(255,255,255,0.72)' }]}>
                {user?.email ?? 'Not signed in'}
              </Text>
              <View style={styles.demoTag}>
                <Text style={[Typography.small, { color: '#ffffff', fontSize: 10 }]}>
                  {user?.isDemoAccount ? 'Demo Account · Local Stage 1' : 'Local Profile · Stage 1'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Streak Summary Banner */}
          <Card style={styles.streakCard}>
            <View style={styles.streakRow}>
              <View style={[styles.streakIcon, { backgroundColor: palette.sageTint }]}>
                <AppIcon name="target" size={18} color={palette.accentMint} />
              </View>
              <View style={styles.streakCopy}>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {summary?.currentStreakDays ?? 0} day focus streak
                </Text>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Longest recorded streak: {summary?.longestStreakDays ?? 0} days
                </Text>
              </View>
            </View>
          </Card>

          {/* Analytics & History */}
          <View style={styles.section}>
            <SectionHeader
              title="Analytics"
              eyebrow="Productivity Summary"
              rightMeta={`+${summary?.weeklyTrendPercent ?? 0}% this week`}
            />

            <View style={styles.metricGrid}>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Total focused</Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {formatMinutesAsDuration(summary?.totalFocusedMinutes ?? 0)}
                </Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Completed sessions
                </Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {summary?.completedSessionsCount ?? 0}
                </Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Avg. session</Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {summary?.averageSessionMinutes ?? 0}m
                </Text>
              </Card>
              <Card style={styles.metricCard}>
                <Text style={[Typography.small, { color: palette.textMuted }]}>Tasks done</Text>
                <Text style={[Typography.h2, { color: palette.text }]}>
                  {summary?.tasksCompletedCount ?? 0}/{summary?.tasksTotalCount ?? 0}
                </Text>
              </Card>
            </View>

            {/* 7-day bar breakdown */}
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                  Weekly focus distribution
                </Text>
                <Text style={[Typography.small, { color: palette.accentMint }]}>
                  {formatMinutesAsDuration(summary?.weekFocusedMinutes ?? 0)}
                </Text>
              </View>
              <View style={styles.barChart}>
                {(summary?.dailyBreakdown ?? []).map((point, idx) => {
                  const pct = Math.max(10, Math.round((point.minutes / maxDailyMins) * 100));
                  const isPeak =
                    point.minutes > 0 &&
                    point.minutes ===
                      Math.max(...(summary?.dailyBreakdown ?? []).map((d) => d.minutes));
                  return (
                    <View key={`${point.dateKey}-${idx}`} style={styles.barCol}>
                      <Text style={[Typography.small, { color: palette.textMuted, fontSize: 9 }]}>
                        {point.minutes > 0 ? `${point.minutes}m` : ''}
                      </Text>
                      {isPeak ? (
                        <LinearGradient
                          colors={palette.energyGradient}
                          style={[styles.barItem, { height: `${pct}%` }]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.barItem,
                            {
                              height: `${pct}%`,
                              backgroundColor:
                                palette.mode === 'dark'
                                  ? 'rgba(255,255,255,0.2)'
                                  : palette.sageTint,
                            },
                          ]}
                        />
                      )}
                      <Text style={[Typography.small, { color: palette.textMuted }]}>
                        {point.dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {/* Category breakdown */}
            {(summary?.categoryBreakdown.length ?? 0) > 0 ? (
              <Card style={styles.categoryCard}>
                <Text style={[Typography.bodySemiBold, { color: palette.text, marginBottom: 8 }]}>
                  Focus by category
                </Text>
                <View style={styles.catList}>
                  {summary!.categoryBreakdown.slice(0, 5).map((cat) => {
                    const widthPct = Math.max(
                      8,
                      Math.round((cat.minutes / maxCategoryMins) * 100),
                    );
                    return (
                      <View key={cat.category} style={styles.catRow}>
                        <View style={styles.catLabelRow}>
                          <Text style={[Typography.caption, { color: palette.text }]}>
                            {cat.category} ({cat.taskCount} tasks)
                          </Text>
                          <Text style={[Typography.small, { color: palette.textMuted }]}>
                            {formatMinutesAsDuration(cat.minutes)}
                          </Text>
                        </View>
                        <View style={[styles.track, { backgroundColor: palette.surfaceMuted }]}>
                          <View
                            style={[
                              styles.fill,
                              {
                                width: `${widthPct}%`,
                                backgroundColor: palette.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}
          </View>

          {/* Past Focus Sessions History */}
          <View style={styles.section}>
            <SectionHeader
              title="Session History"
              rightMeta={`${sessions.length} recorded`}
            />
            <Card noPadding>
              {sessions.length > 0 ? (
                <View style={styles.historyPad}>
                  {sessions.slice(0, 8).map((item, idx, arr) => {
                    const isCompleted = item.status === 'completed';
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.historyRow,
                          idx < arr.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: palette.borderSubtle,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.historyIcon,
                            {
                              backgroundColor: isCompleted
                                ? palette.successSoft
                                : palette.dangerSoft,
                            },
                          ]}
                        >
                          <AppIcon
                            name={isCompleted ? 'check' : 'close'}
                            size={15}
                            color={isCompleted ? palette.successText : palette.dangerText}
                          />
                        </View>
                        <View style={styles.historyCopy}>
                          <Text style={[Typography.bodySemiBold, { color: palette.text }]} numberOfLines={1}>
                            {item.taskTitleSnapshot}
                          </Text>
                          <Text style={[Typography.small, { color: palette.textMuted }]}>
                            {Math.round(item.actualFocusSeconds / 60)}m focused ·{' '}
                            {item.pauseCount} pause{item.pauseCount === 1 ? '' : 's'} ·{' '}
                            {item.completedCheckpointCount}/{item.checkpointCount} checkpoints
                          </Text>
                        </View>
                        <View style={styles.historyRight}>
                          <Text
                            style={[
                              Typography.small,
                              {
                                color: isCompleted ? palette.successText : palette.dangerText,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {item.status}
                          </Text>
                          {item.startedAt ? (
                            <Text style={[Typography.small, { color: palette.textMuted }]}>
                              {formatShortDate(item.startedAt)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  icon="clock"
                  title="No sessions recorded yet"
                  description="Complete a focus session to see your focused minutes and checkpoint history here."
                />
              )}
            </Card>
          </View>

          {/* Preferences & Permissions */}
          <View style={styles.section}>
            <SectionHeader title="Preferences" />
            <Card style={styles.prefsCard}>
              <View style={styles.prefGrid}>
                <SelectField
                  label="Default focus duration"
                  value={String(preferences.focusDefaultMinutes)}
                  options={FOCUS_DURATION_PRESETS.map((m) => ({
                    label: `${m} minutes`,
                    value: String(m),
                  }))}
                  onChange={(v) => void updatePreferences({ focusDefaultMinutes: Number(v) })}
                  icon="clock"
                />

                <View style={styles.twoCol}>
                  <SelectField
                    label="Short break"
                    value={String(preferences.shortBreakMinutes)}
                    options={SHORT_BREAK_OPTIONS.map((m) => ({
                      label: `${m} min`,
                      value: String(m),
                    }))}
                    onChange={(v) => void updatePreferences({ shortBreakMinutes: Number(v) })}
                    containerStyle={styles.flexOne}
                  />
                  <SelectField
                    label="Long break"
                    value={String(preferences.longBreakMinutes)}
                    options={LONG_BREAK_OPTIONS.map((m) => ({
                      label: `${m} min`,
                      value: String(m),
                    }))}
                    onChange={(v) => void updatePreferences({ longBreakMinutes: Number(v) })}
                    containerStyle={styles.flexOne}
                  />
                </View>

                <SelectField
                  label="Reminder lead time"
                  value={String(preferences.remindBeforeSessionMinutes)}
                  options={REMINDER_LEAD_OPTIONS.map((m) => ({
                    label: `${m} minutes before session`,
                    value: String(m),
                  }))}
                  onChange={(v) =>
                    void updatePreferences({ remindBeforeSessionMinutes: Number(v) })
                  }
                  icon="bell"
                />
              </View>

              <Divider />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Notifications & reminders
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Local session completion & deadline alerts
                  </Text>
                </View>
                <ToggleSwitch
                  value={preferences.notificationsEnabled}
                  onValueChange={(v) => {
                    void updatePreferences({ notificationsEnabled: v });
                    if (v) {
                      void requestNotificationPermission().then((perm) => {
                        if (perm.status !== 'granted' && perm.status !== 'unavailable') {
                          showToast(
                            perm.canAskAgain
                              ? 'Allow notifications to receive focus completion alerts.'
                              : 'Enable notifications in Android Settings.',
                            'warning',
                          );
                        }
                      });
                    }
                  }}
                />
              </View>

              <SecondaryButton
                title="Send Test Notification (3s)"
                icon="bell"
                fullWidth
                onPress={() => {
                  void sendTestLocalNotification(3).then((res) => {
                    if (res.scheduled) {
                      showToast('Test notification will arrive in 3 seconds.', 'success');
                    } else if (res.permissionStatus === 'denied' && !res.canAskAgain) {
                      showToast('Notifications blocked in Settings — opening Settings.', 'warning');
                      void openAppSystemSettings();
                    } else {
                      showToast(res.reason ?? 'Unable to schedule notification.', 'warning');
                    }
                  });
                }}
              />

              <Divider />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                    Camera checkpoints by default
                  </Text>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>
                    Images stay private & unsaved
                  </Text>
                </View>
                <ToggleSwitch
                  value={preferences.checkpointEnabled}
                  onValueChange={(v) => void updatePreferences({ checkpointEnabled: v })}
                />
              </View>

              <Divider />

              <View style={styles.themeBlock}>
                <Text style={[Typography.caption, { color: palette.textSecondary, fontWeight: '600' }]}>
                  Appearance
                </Text>
                <View
                  style={[
                    styles.segmented,
                    { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                  ]}
                >
                  {THEME_OPTIONS.map((opt) => {
                    const active = preferences.theme === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => void updatePreferences({ theme: opt.value })}
                        style={[
                          styles.segBtn,
                          active && { backgroundColor: palette.surfaceGlassStrong },
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
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          </View>

          {/* Blocker Permissions Quick Status */}
          <View style={styles.section}>
            <SectionHeader title="Blocker Permissions" eyebrow="Android Simulation" />
            <View style={styles.permList}>
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

          {/* Data & Account Actions */}
          <View style={styles.actionsSection}>
            <SecondaryButton
              title="Preview Welcome Onboarding"
              icon="spark"
              onPress={() => router.push('/?preview=1')}
              fullWidth
            />
            <SecondaryButton
              title="Reset Demo Data"
              icon="refresh"
              onPress={() => setResetConfirmOpen(true)}
              fullWidth
            />
            <SecondaryButton
              title="Sign Out"
              icon="logout"
              variant="dangerOutline"
              onPress={handleSignOut}
              fullWidth
            />
            <Text style={[Typography.small, styles.versionText, { color: palette.textMuted }]}>
              ProcrastiStop Stage 1 · Local Persistence Prototype
            </Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={resetConfirmOpen}
        title="Reset demo data?"
        description="This clears local AsyncStorage edits for tasks, focus sessions, blocked apps, and settings, then re-seeds fresh demo records."
        confirmLabel="Reset data"
        destructive
        icon="refresh"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          setResetConfirmOpen(false);
          void resetDemoData();
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
  profileCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  demoTag: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  streakCard: {
    marginTop: Spacing.md,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  streakIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCopy: {
    flex: 1,
    gap: 2,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metricCard: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
  chartCard: {
    marginTop: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  barChart: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  barItem: {
    width: 16,
    borderRadius: 6,
    minHeight: 8,
  },
  categoryCard: {
    marginTop: Spacing.md,
  },
  catList: {
    gap: Spacing.md,
  },
  catRow: {
    gap: 5,
  },
  catLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  historyPad: {
    paddingHorizontal: Spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCopy: {
    flex: 1,
    gap: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  prefsCard: {
    gap: Spacing.md,
  },
  prefGrid: {
    gap: Spacing.md,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flexOne: {
    flex: 1,
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
  themeBlock: {
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: 6,
  },
  segBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permList: {
    gap: Spacing.md,
  },
  actionsSection: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
