import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskRow } from '@/components/task/TaskRow';
import { Card } from '@/components/ui/Card';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAnalytics } from '@/features/analytics/useAnalytics';
import { sortTasks } from '@/features/tasks/taskUtils';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';
import {
  formatMinutesAsDuration,
  formatTodayHeaderDate,
  getGreeting,
  getTaskDeadlineState,
} from '@/utils/date';

export default function HomeScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const user = useSettingsStore((s) => s.user);
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTaskComplete = useTaskStore((s) => s.toggleTaskComplete);
  const { summary } = useAnalytics();

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

  const firstName = user?.fullName.split(' ')[0] ?? 'there';

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
      >
        <View style={styles.inner}>
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
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityLabel="Open profile"
              style={[
                styles.avatar,
                { backgroundColor: palette.mode === 'dark' ? '#d9f0df' : palette.primary },
              ]}
            >
              <Text
                style={[
                  Typography.caption,
                  { color: palette.mode === 'dark' ? '#0c3b2d' : '#ffffff', fontWeight: '800' },
                ]}
              >
                {user?.initials ?? 'FL'}
              </Text>
            </Pressable>
          </View>

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

          <View style={styles.section}>
            <SectionHeader
              title="Priority & deadlines"
              actionLabel="View all"
              onActionPress={() => router.push('/(tabs)/tasks')}
            />
            <Card noPadding>
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
            </Card>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  headerCopy: { flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  overviewStrip: {
    flexDirection: 'row',
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md + 2,
    marginBottom: Spacing.lg,
  },
  overviewCell: { flex: 1, paddingHorizontal: Spacing.md, borderRightWidth: 1, gap: 2 },
  overviewLastCell: { flex: 1, paddingHorizontal: Spacing.md, gap: 2 },
  section: { marginTop: Spacing.xxl },
  listPad: { paddingHorizontal: Spacing.lg },
});
