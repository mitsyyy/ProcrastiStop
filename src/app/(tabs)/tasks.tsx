import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskCard } from '@/components/task/TaskCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { selectFilteredSortedTasks, useTaskStore } from '@/store/taskStore';
import type { TaskFilterStatus } from '@/types/task';

const STATUS_TABS: { key: TaskFilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

export default function TasksScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const state = useTaskStore();
  const filteredTasks = useMemo(() => selectFilteredSortedTasks(state), [state]);

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
      >
        <View style={styles.inner}>
          <AppHeader
            title="My Tasks"
            subtitle="Stay ahead of every deadline."
            right={
              <IconButton
                icon="plus"
                variant="filledEnergy"
                accessibilityLabel="Create task"
                onPress={() => router.push('/tasks/create')}
              />
            }
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filterBar,
              { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
            ]}
          >
            {STATUS_TABS.map((tab) => {
              const active = state.filterStatus === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => state.setFilterStatus(tab.key)}
                  style={[styles.filterBtn, active && { backgroundColor: palette.surfaceGlassStrong }]}
                >
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color: active ? palette.text : palette.textMuted,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.listSection}>
            <SectionHeader
              title={STATUS_TABS.find((t) => t.key === state.filterStatus)?.label ?? 'Tasks'}
              rightMeta={`${filteredTasks.length} item${filteredTasks.length === 1 ? '' : 's'}`}
            />
            <View style={styles.cardStack}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={() => void state.toggleTaskComplete(task.id)}
                  onPress={() =>
                    router.push({ pathname: '/tasks/[taskId]', params: { taskId: task.id } })
                  }
                  onStartFocus={() =>
                    router.push({ pathname: '/focus/setup', params: { taskId: task.id } })
                  }
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: Layout.maxContentWidth },
  filterBar: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radii.md, borderWidth: 1 },
  filterBtn: { minHeight: 36, paddingHorizontal: Spacing.md, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  listSection: { marginTop: Spacing.xl },
  cardStack: { gap: Spacing.md },
});
