import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimerRing } from '@/components/focus/TimerRing';
import { TaskRow } from '@/components/task/TaskRow';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Layout, Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAnalytics } from '@/features/analytics/useAnalytics';
import { getSessionRemainingRatio } from '@/features/focus/focusUtils';
import { useReminders } from '@/features/notifications/useReminders';
import { sortTasks } from '@/features/tasks/taskUtils';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusTicker } from '@/hooks/useFocusTicker';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import {
  formatCountdown,
  formatMinutesAsDuration,
  formatTodayHeaderDate,
  getGreeting,
  getTaskDeadlineState,
} from '@/utils/date';

export default function HomeScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [remindersVisible, setRemindersVisible] = useState(false);

  const user = useSettingsStore((s) => s.user);
  const preferences = useSettingsStore((s) => s.preferences);
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTaskComplete = useTaskStore((s) => s.toggleTaskComplete);

  const activeSession = useFocusStore((s) => s.activeSession);
  const remainingSeconds = useFocusStore((s) => s.remainingSeconds);

  useFocusTicker(() => {
    router.push('/focus/completed');
  });

  const { summary } = useAnalytics();
  const reminders = useReminders();

  const openTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
        'deadline',
      ),
    [tasks],
  );

  const urgentOrDueCount = useMemo(
    () =>
      openTasks.filter((t) => {
        const s = getTaskDeadlineState(t);
        return s === 'overdue' || s === 'due_soon';
      }).length,
    [openTasks],
  );

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'completed').length,
    [tasks],
  );

  const primaryTask = openTasks[0] ?? null;
  const hasActiveOrPaused =
    activeSession?.status === 'active' || activeSession?.status === 'paused';

  const heroPlannedMinutes =
    hasActiveOrPaused && activeSession
      ? activeSession.plannedDurationMinutes
      : preferences.focusDefaultMinutes;

  const heroRemainingSeconds =
    hasActiveOrPaused && activeSession ? remainingSeconds : heroPlannedMinutes * 60;

  const heroProgress = hasActiveOrPaused
    ? getSessionRemainingRatio(heroPlannedMinutes, heroRemainingSeconds)
    : 1;

  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const maxDailyMins = Math.max(
    45,
    ...(summary?.dailyBreakdown.map((d) => d.minutes) ?? [60]),
  );

  return (
    <ScreenBackground variant="home">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Layout.floatingNavHeight + Spacing.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[Typography.eyebrow, { color: palette.textMuted }]}>
                {formatTodayHeaderDate()}
              </Text>
              <Text style={[Typography.h1, { color: palette.text, marginTop: 4 }]}>
                {getGreeting()}, {firstName}.
              </Text>
              <Text style={[Typography.body, { color: palette.textMuted, marginTop: 2 }]}>
                Protect your time for what matters today.
              </Text>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                icon="bell"
                badgeDot={reminders.length > 0}
                accessibilityLabel="Reminder previews"
                onPress={() => setRemindersVisible(true)}
              />
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                accessibilityLabel="Open profile"
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      palette.mode === 'dark' ? '#d9f0df' : palette.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.caption,
                    {
                      color: palette.mode === 'dark' ? '#0c3b2d' : '#ffffff',
                      fontWeight: '800',
                    },
                  ]}
                >
                  {user?.initials ?? 'FL'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Daily Overview Strip */}
          <View
            style={[
              styles.overviewStrip,
              { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
            ]}
          >
            <View style={[styles.overviewCell, { borderRightColor: palette.border }]}>
              <Text style={[Typography.h2, { color: palette.text }]}>{urgentOrDueCount}</Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Due soon / late</Text>
            </View>
            <View style={[styles.overviewCell, { borderRightColor: palette.border }]}>
              <Text style={[Typography.h2, { color: palette.text }]}>{completedCount}</Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Completed</Text>
            </View>
            <View style={styles.overviewLastCell}>
              <Text style={[Typography.h2, { color: palette.text }]}>
                {formatMinutesAsDuration(summary?.todayFocusedMinutes ?? 0)}
              </Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Focused today</Text>
            </View>
          </View>

          {/* Active Session Banner OR Hero Focus Command Card */}
          <View
            style={[
              styles.heroCardShell,
              {
                borderColor:
                  hasActiveOrPaused ? palette.energyOrange : 'rgba(255,255,255,0.16)',
              },
            ]}
          >
            <LinearGradient
              colors={
                palette.mode === 'dark'
                  ? ['#113d2e', '#0d3126']
                  : ['#264c3b', '#1b392b']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
            <View style={styles.heroTop}>
              <View style={styles.heroTopLeft}>
                <View style={styles.statusPill}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: hasActiveOrPaused
                          ? palette.energyYellow
                          : '#8ee6b9',
                      },
                    ]}
                  />
                  <Text style={[Typography.eyebrow, { color: 'rgba(255,255,255,0.7)' }]}>
                    {hasActiveOrPaused
                      ? activeSession?.status === 'paused'
                        ? 'Session paused'
                        : 'Session active'
                      : 'Ready for focus'}
                  </Text>
                </View>
                <Text style={[Typography.h3, { color: '#ffffff', marginTop: 6 }]} numberOfLines={1}>
                  {hasActiveOrPaused && activeSession
                    ? activeSession.taskTitleSnapshot
                    : primaryTask?.title ?? 'Deep work block'}
                </Text>
              </View>

              <View style={styles.sessionCountBox}>
                <Text style={[Typography.bodySemiBold, { color: '#ffffff' }]}>
                  {summary?.completedSessionsCount ?? 0}
                </Text>
                <Text style={[Typography.small, { color: 'rgba(255,255,255,0.6)', fontSize: 9 }]}>
                  sessions
                </Text>
              </View>
            </View>

            <View style={styles.ringWrap}>
              <TimerRing progress={heroProgress} size={208} strokeWidth={11}>
                <Text style={[Typography.small, { color: 'rgba(255,255,255,0.62)' }]}>
                  {hasActiveOrPaused
                    ? activeSession?.status === 'paused'
                      ? 'Paused at'
                      : 'Time remaining'
                    : 'Ready when you are'}
                </Text>
                <Text style={[Typography.homeTimer, { color: '#ffffff', marginVertical: 2 }]}>
                  {formatCountdown(heroRemainingSeconds)}
                </Text>
                <Text style={[Typography.small, { color: 'rgba(255,255,255,0.52)' }]}>
                  {heroPlannedMinutes} min block
                </Text>
              </TimerRing>
            </View>

            <Text style={[Typography.caption, styles.heroNudge]}>
              {hasActiveOrPaused
                ? 'Your timer stays synced even when you switch apps.'
                : 'One protected focus block puts your next deadline within reach.'}
            </Text>

            <View style={styles.launchRow}>
              <Pressable
                onPress={() => router.push('/(tabs)/focus')}
                accessibilityLabel="Focus & blocker settings"
                style={styles.secondaryCircleBtn}
              >
                <AppIcon name="shield" size={20} color="#153c30" />
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push(
                    hasActiveOrPaused
                      ? '/focus/active'
                      : primaryTask
                        ? { pathname: '/focus/setup', params: { taskId: primaryTask.id } }
                        : '/focus/setup',
                  )
                }
                accessibilityLabel={hasActiveOrPaused ? 'Resume focus view' : 'Start focus session'}
              >
                <LinearGradient
                  colors={palette.energyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.mainPlayCircle, Shadows.energyButton]}
                >
                  <AppIcon name="play" size={26} color="#ffffff" />
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() =>
                  primaryTask
                    ? router.push({ pathname: '/tasks/[taskId]', params: { taskId: primaryTask.id } })
                    : router.push('/tasks/create')
                }
                accessibilityLabel={primaryTask ? 'Open priority task' : 'Create a task'}
                style={styles.secondaryCircleBtn}
              >
                <AppIcon name={primaryTask ? 'chevron' : 'plus'} size={20} color="#153c30" />
              </Pressable>
            </View>
            </LinearGradient>
          </View>

          {/* Priority & Upcoming Deadlines */}
          <View style={styles.section}>
            <SectionHeader
              title="Priority & deadlines"
              actionLabel="View all"
              onActionPress={() => router.push('/(tabs)/tasks')}
            />
            <Card noPadding>
              {openTasks.length > 0 ? (
                <View style={styles.listPad}>
                  {openTasks.slice(0, 4).map((task, idx, arr) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isLast={idx === arr.length - 1}
                      onToggleComplete={() => void toggleTaskComplete(task.id)}
                      onPress={() =>
                        router.push({ pathname: '/tasks/[taskId]', params: { taskId: task.id } })
                      }
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="check"
                  title="All caught up"
                  description="You have no pending deadlines. Add a task to plan your next focus block."
                  actionLabel="Add a task"
                  onAction={() => router.push('/tasks/create')}
                />
              )}
            </Card>
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.quickGrid}>
            <Pressable
              onPress={() => router.push('/tasks/create')}
              style={[
                styles.quickBtn,
                { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
              ]}
            >
              <View style={[styles.quickIconBox, { backgroundColor: palette.sageTint }]}>
                <AppIcon name="plus" size={18} color={palette.accentMint} />
              </View>
              <View style={styles.quickCopy}>
                <Text style={[Typography.label, { color: palette.text }]}>Add task</Text>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Set a deadline
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={[
                styles.quickBtn,
                { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
              ]}
            >
              <View style={[styles.quickIconBox, { backgroundColor: palette.sageTint }]}>
                <AppIcon name="chart" size={18} color={palette.accentMint} />
              </View>
              <View style={styles.quickCopy}>
                <Text style={[Typography.label, { color: palette.text }]}>Weekly progress</Text>
                <Text style={[Typography.small, { color: palette.textMuted }]}>View insights</Text>
              </View>
            </Pressable>
          </View>

          {/* Weekly Focus Summary Mini-Chart */}
          <View style={styles.section}>
            <Card>
              <View style={styles.weeklyTop}>
                <View>
                  <Text style={[Typography.eyebrow, { color: palette.textMuted }]}>This week</Text>
                  <Text style={[Typography.h2, { color: palette.text, marginTop: 2 }]}>
                    {formatMinutesAsDuration(summary?.weekFocusedMinutes ?? 0)} focused
                  </Text>
                </View>
                <View style={[styles.trendPill, { backgroundColor: palette.successSoft }]}>
                  <Text style={[Typography.small, { color: palette.successText, fontWeight: '700' }]}>
                    +{summary?.weeklyTrendPercent ?? 0}%
                  </Text>
                </View>
              </View>

              <View style={styles.miniChart}>
                {(summary?.dailyBreakdown ?? []).map((point, idx) => {
                  const pct = Math.max(10, Math.round((point.minutes / maxDailyMins) * 100));
                  const isPeak =
                    point.minutes > 0 &&
                    point.minutes ===
                      Math.max(...(summary?.dailyBreakdown ?? []).map((d) => d.minutes));
                  return (
                    <View key={`${point.dateKey}-${idx}`} style={styles.barCol}>
                      {isPeak ? (
                        <LinearGradient
                          colors={palette.energyGradient}
                          style={[styles.bar, { height: `${pct}%` }]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.bar,
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
          </View>
        </View>
      </ScrollView>

      {/* Reminders Preview Modal */}
      <Modal
        visible={remindersVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRemindersVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setRemindersVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.h3, { color: palette.text }]}>
                  Reminder Previews
                </Text>
                <Text style={[Typography.small, { color: palette.textMuted }]}>
                  Simulated local deadline & session notifications
                </Text>
              </View>
              <Pressable onPress={() => setRemindersVisible(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.reminderScroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
              {reminders.length > 0 ? (
                reminders.map((rem) => {
                  const toneColor =
                    rem.kind === 'overdue'
                      ? palette.dangerText
                      : rem.kind === 'deadline'
                        ? palette.warningText
                        : palette.accentMint;
                  const toneBg =
                    rem.kind === 'overdue'
                      ? palette.dangerSoft
                      : rem.kind === 'deadline'
                        ? palette.warningSoft
                        : palette.sageTint;

                  return (
                    <Pressable
                      key={rem.id}
                      onPress={() => {
                        setRemindersVisible(false);
                        if (rem.taskId) {
                          router.push({
                            pathname: '/tasks/[taskId]',
                            params: { taskId: rem.taskId },
                          });
                        } else {
                          router.push('/(tabs)/focus');
                        }
                      }}
                      style={[styles.reminderRow, { borderBottomColor: palette.borderSubtle }]}
                    >
                      <View style={[styles.remIcon, { backgroundColor: toneBg }]}>
                        <AppIcon
                          name={rem.kind === 'session' ? 'bell' : 'clock'}
                          size={18}
                          color={toneColor}
                        />
                      </View>
                      <View style={styles.remCopy}>
                        <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                          {rem.title}
                        </Text>
                        <Text style={[Typography.caption, { color: palette.textMuted }]}>
                          {rem.body}
                        </Text>
                        <Text style={[Typography.small, { color: toneColor, marginTop: 2 }]}>
                          {rem.scheduledLabel}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={[Typography.body, { color: palette.textMuted, paddingVertical: 16 }]}>
                  Notifications are turned off or no urgent deadlines are queued.
                </Text>
              )}
            </ScrollView>

            <PrimaryButton
              title="Manage Reminder Preferences"
              onPress={() => {
                setRemindersVisible(false);
                router.push('/(tabs)/focus');
              }}
            />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  headerCopy: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewStrip: {
    flexDirection: 'row',
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.lg,
  },
  overviewCell: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    borderRightWidth: 1,
    gap: 2,
  },
  overviewLastCell: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    gap: 2,
  },
  heroCardShell: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroCard: {
    borderRadius: Radii.xl - 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroTopLeft: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sessionCountBox: {
    minWidth: 54,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  ringWrap: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  heroNudge: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  launchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  secondaryCircleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: Spacing.xxl,
  },
  listPad: {
    paddingHorizontal: Spacing.lg,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  quickBtn: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  quickIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCopy: {
    flex: 1,
    gap: 2,
  },
  weeklyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  trendPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radii.xs,
  },
  miniChart: {
    height: 100,
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
    gap: 6,
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    maxHeight: '78%',
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderScroll: {
    maxHeight: 340,
  },
  reminderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  remIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remCopy: {
    flex: 1,
    gap: 2,
  },
});
