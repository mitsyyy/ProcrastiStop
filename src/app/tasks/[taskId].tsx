import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeadlineBadge } from '@/components/task/DeadlineBadge';
import { PriorityBadge } from '@/components/task/PriorityBadge';
import { StatusBadge } from '@/components/task/StatusBadge';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useFocusStore } from '@/store/focusStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import type { TaskStatus } from '@/types/task';
import {
  formatFullDateTime,
  formatRemainingTimeUntil,
  formatShortDate,
  getTaskDeadlineState,
} from '@/utils/date';

const STATUS_ACTIONS: { status: TaskStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'cancelled', label: 'Cancelled' },
];

export default function TaskDetailScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const task = useTaskStore((s) => s.tasks.find((item) => item.id === taskId));
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const sessions = useFocusStore((s) => s.sessions);
  const showToast = useSettingsStore((s) => s.showToast);

  const linkedSessions = useMemo(
    () => sessions.filter((s) => s.taskId === taskId),
    [sessions, taskId],
  );

  if (!task) {
    return (
      <ScreenBackground variant="surface">
        <View style={[styles.missingWrap, { paddingTop: insets.top + Spacing.md }]}>
          <AppHeader title="Task details" onBack={() => router.back()} />
          <ErrorState
            title="Task unavailable"
            message="This task could not be found in local storage."
            onRetry={() => router.replace('/(tabs)/tasks')}
          />
        </View>
      </ScreenBackground>
    );
  }

  const deadlineState = getTaskDeadlineState(task);
  const panelBg =
    deadlineState === 'overdue'
      ? palette.dangerSoft
      : deadlineState === 'due_soon'
        ? palette.warningSoft
        : palette.sageTint;
  const panelAccent =
    deadlineState === 'overdue'
      ? palette.dangerText
      : deadlineState === 'due_soon'
        ? palette.warningText
        : palette.accentMint;

  const handleStatusChange = async (nextStatus: TaskStatus) => {
    await updateTask(task.id, { status: nextStatus });
    showToast(`Status updated to ${nextStatus.replace('_', ' ')}.`, 'success');
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await deleteTask(task.id);
    showToast('Task deleted.', 'info');
    router.replace('/(tabs)/tasks');
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
      >
        <View style={styles.inner}>
          <AppHeader
            title="Task details"
            onBack={() => router.back()}
            right={
              <IconButton
                icon="close"
                accessibilityLabel="Delete task"
                onPress={() => setConfirmDelete(true)}
              />
            }
          />

          <View style={styles.badgeGroup}>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            <DeadlineBadge task={task} />
          </View>

          <Text style={[Typography.h1, styles.title, { color: palette.text }]}>{task.title}</Text>
          {task.description ? (
            <Text style={[Typography.body, styles.desc, { color: palette.textSecondary }]}>
              {task.description}
            </Text>
          ) : (
            <Text style={[Typography.caption, { color: palette.textMuted, marginBottom: 18 }]}>
              No description added.
            </Text>
          )}

          {/* Deadline Panel */}
          <View style={[styles.deadlinePanel, { backgroundColor: panelBg, borderColor: panelAccent }]}>
            <View style={styles.deadlineCopy}>
              <Text style={[Typography.small, { color: panelAccent, fontWeight: '700' }]}>
                {deadlineState === 'overdue'
                  ? 'Overdue deadline'
                  : deadlineState === 'due_soon'
                    ? 'Due within 24 hours'
                    : deadlineState === 'completed'
                      ? 'Completed'
                      : task.deadline
                        ? 'Upcoming deadline'
                        : 'Flexible schedule'}
              </Text>
              <Text style={[Typography.h3, { color: palette.text, marginVertical: 3 }]}>
                {formatRemainingTimeUntil(task.deadline)}
              </Text>
              <Text style={[Typography.small, { color: palette.textMuted }]}>
                {formatFullDateTime(task.deadline)}
              </Text>
            </View>
            <AppIcon name="clock" size={26} color={panelAccent} />
          </View>

          {/* 2x2 Info Grid */}
          <Card noPadding style={styles.infoGridCard}>
            <View style={styles.gridRow}>
              <View style={[styles.gridCell, { borderRightColor: palette.borderSubtle }]}>
                <AppIcon name="clock" size={18} color={palette.accentMint} />
                <View>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>Estimate</Text>
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '700' }]}>
                    {task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'Unset'}
                  </Text>
                </View>
              </View>
              <View style={styles.gridCell}>
                <AppIcon name="briefcase" size={18} color={palette.accentMint} />
                <View>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>Category</Text>
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '700' }]}>
                    {task.category}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.gridRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.borderSubtle }]}>
              <View style={[styles.gridCell, { borderRightColor: palette.borderSubtle }]}>
                <AppIcon name="target" size={18} color={palette.accentMint} />
                <View>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>Sessions</Text>
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '700' }]}>
                    {linkedSessions.length} logged
                  </Text>
                </View>
              </View>
              <View style={styles.gridCell}>
                <AppIcon name="calendar" size={18} color={palette.accentMint} />
                <View>
                  <Text style={[Typography.small, { color: palette.textMuted }]}>Created</Text>
                  <Text style={[Typography.caption, { color: palette.text, fontWeight: '700' }]}>
                    {formatShortDate(task.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Quick Status Transitions */}
          <View style={styles.section}>
            <Text style={[Typography.h3, { color: palette.text, marginBottom: Spacing.sm }]}>
              Quick Status Update
            </Text>
            <View style={styles.statusGrid}>
              {STATUS_ACTIONS.map((item) => {
                const active = task.status === item.status;
                return (
                  <Pressable
                    key={item.status}
                    onPress={() => void handleStatusChange(item.status)}
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: active ? palette.sageTint : palette.surfaceGlass,
                        borderColor: active ? palette.accentMint : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.caption,
                        {
                          color: active ? palette.accentMint : palette.textSecondary,
                          fontWeight: active ? '700' : '600',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Focus Activity Timeline */}
          <View style={styles.section}>
            <Text style={[Typography.h3, { color: palette.text, marginBottom: Spacing.md }]}>
              Focus Activity
            </Text>
            {linkedSessions.length > 0 ? (
              <View style={styles.timeline}>
                {linkedSessions.map((session) => (
                  <View
                    key={session.id}
                    style={[styles.timelineItem, { borderLeftColor: palette.border }]}
                  >
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor:
                            session.status === 'completed'
                              ? palette.success
                              : palette.warning,
                        },
                      ]}
                    />
                    <View style={styles.timelineCopy}>
                      <Text style={[Typography.bodySemiBold, { color: palette.text }]}>
                        {Math.round(session.actualFocusSeconds / 60)} min focus block ({session.status})
                      </Text>
                      <Text style={[Typography.small, { color: palette.textMuted }]}>
                        {session.startedAt ? formatFullDateTime(session.startedAt) : 'Recorded session'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Card variant="subtle">
                <Text style={[Typography.caption, { color: palette.textMuted }]}>
                  No focus sessions recorded for this task yet. Start one below to build momentum.
                </Text>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Actions */}
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
          <SecondaryButton
            title="Edit"
            icon="edit"
            onPress={() =>
              router.push({ pathname: '/tasks/edit/[taskId]', params: { taskId: task.id } })
            }
            style={styles.editBtn}
          />
          <PrimaryButton
            title="Start Focus Session"
            icon="play"
            tone="energy"
            fullWidth={false}
            onPress={() =>
              router.push({ pathname: '/focus/setup', params: { taskId: task.id } })
            }
            style={styles.focusBtn}
          />
        </View>
      </View>

      <ConfirmationModal
        visible={confirmDelete}
        title="Delete this task?"
        description={`"${task.title}" will be permanently removed from your local task list.`}
        confirmLabel="Delete"
        destructive
        icon="alert"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  missingWrap: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
  },
  badgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  desc: {
    marginBottom: Spacing.xl,
  },
  deadlinePanel: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  deadlineCopy: {
    flex: 1,
  },
  infoGridCard: {
    marginTop: Spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    borderLeftWidth: 1.5,
    paddingLeft: Spacing.lg,
    paddingBottom: Spacing.lg,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -5.5,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineCopy: {
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
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editBtn: {
    flex: 1,
  },
  focusBtn: {
    flex: 1.7,
  },
});
