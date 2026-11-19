import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeadlineBadge } from '@/components/task/DeadlineBadge';
import { PriorityBadge } from '@/components/task/PriorityBadge';
import { StatusBadge } from '@/components/task/StatusBadge';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/store/taskStore';
import {
  formatFullDateTime,
  formatRemainingTimeUntil,
  formatShortDate,
  getTaskDeadlineState,
} from '@/utils/date';

export default function TaskDetailScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const task = useTaskStore((s) => s.tasks.find((item) => item.id === taskId));

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
          <AppHeader title="Task details" onBack={() => router.back()} />

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
          ) : null}

          <View style={[styles.deadlinePanel, { backgroundColor: panelBg, borderColor: panelAccent }]}>
            <View style={styles.deadlineCopy}>
              <Text style={[Typography.small, { color: panelAccent, fontWeight: '700' }]}>
                Deadline status
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
            <View
              style={[
                styles.gridRow,
                { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.borderSubtle },
              ]}
            >
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
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  missingWrap: { flex: 1, paddingHorizontal: Spacing.xl },
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth },
  badgeGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs + 2, marginBottom: Spacing.md },
  title: { marginBottom: Spacing.sm },
  desc: { marginBottom: Spacing.xl },
  deadlinePanel: { borderRadius: Radii.lg, borderWidth: 1, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  deadlineCopy: { flex: 1 },
  infoGridCard: { marginTop: Spacing.lg },
  gridRow: { flexDirection: 'row' },
  gridCell: { flex: 1, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRightWidth: StyleSheet.hairlineWidth },
});
