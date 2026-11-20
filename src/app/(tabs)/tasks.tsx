import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TaskCard } from '@/components/task/TaskCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TASK_CATEGORIES } from '@/constants/categories';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { selectFilteredSortedTasks, useTaskStore } from '@/store/taskStore';
import type { TaskFilterStatus, TaskSortBy } from '@/types/task';
import { formatDeadlineLabel, getTaskDeadlineState } from '@/utils/date';

const STATUS_TABS: { key: TaskFilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

const SORT_OPTIONS: { key: TaskSortBy; label: string }[] = [
  { key: 'deadline', label: 'Deadline' },
  { key: 'priority', label: 'Priority' },
  { key: 'recent', label: 'Recent' },
];

export default function TasksScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [showSearch, setShowSearch] = useState(false);

  const state = useTaskStore();
  const filteredTasks = useMemo(() => selectFilteredSortedTasks(state), [state]);

  const openTasks = useMemo(
    () => state.tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled'),
    [state.tasks],
  );

  const overdueCount = useMemo(
    () => openTasks.filter((t) => getTaskDeadlineState(t) === 'overdue').length,
    [openTasks],
  );

  const closestDeadlineLabel = useMemo(() => {
    const withDeadlines = openTasks
      .filter((t) => Boolean(t.deadline))
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
    if (withDeadlines.length === 0) return 'None scheduled';
    return formatDeadlineLabel(withDeadlines[0].deadline);
  }, [openTasks]);

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
            title="My Tasks"
            subtitle="Stay ahead of every deadline."
            right={
              <>
                <IconButton
                  icon="search"
                  accessibilityLabel="Toggle search"
                  onPress={() => {
                    setShowSearch((prev) => !prev);
                    if (showSearch) state.setSearchQuery('');
                  }}
                />
                <IconButton
                  icon="plus"
                  variant="filledEnergy"
                  accessibilityLabel="Create task"
                  onPress={() => router.push('/tasks/create')}
                />
              </>
            }
          />

          {showSearch ? (
            <View
              style={[
                styles.searchBox,
                { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
              ]}
            >
              <AppIcon name="search" size={18} color={palette.textMuted} />
              <TextInput
                value={state.searchQuery}
                onChangeText={state.setSearchQuery}
                placeholder="Search title, notes, or category..."
                placeholderTextColor={palette.placeholder}
                style={[Typography.body, styles.searchInput, { color: palette.text }]}
                autoFocus
              />
              {state.searchQuery ? (
                <Pressable onPress={() => state.setSearchQuery('')} hitSlop={8}>
                  <AppIcon name="close" size={16} color={palette.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Status Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.filterBar,
              { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {STATUS_TABS.map((tab) => {
              const active = state.filterStatus === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => state.setFilterStatus(tab.key)}
                  style={[
                    styles.filterBtn,
                    active && {
                      backgroundColor: palette.surfaceGlassStrong,
                    },
                  ]}
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

          {/* Category + Sort Controls */}
          <View style={styles.controlsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
              showsVerticalScrollIndicator={false}
            >
              {['All', ...TASK_CATEGORIES].map((cat) => {
                const active = state.filterCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => state.setFilterCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? palette.sageTint : palette.surfaceGlass,
                        borderColor: active ? palette.accentMint : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: active ? palette.accentMint : palette.textMuted,
                          fontWeight: active ? '700' : '600',
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sortRow}>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Sort by:</Text>
              {SORT_OPTIONS.map((opt) => {
                const active = state.sortBy === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => state.setSortBy(opt.key)}
                    style={[
                      styles.sortChip,
                      active && { backgroundColor: palette.sageTint },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: active ? palette.accentMint : palette.textMuted,
                          fontWeight: active ? '700' : '500',
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

          {/* Summary Panel */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: palette.sageTint, borderColor: palette.border },
            ]}
          >
            <View style={[styles.summaryCell, { borderRightColor: palette.border }]}>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Open tasks</Text>
              <Text style={[Typography.h3, { color: palette.text }]}>
                {openTasks.length} {overdueCount > 0 ? `(${overdueCount} overdue)` : ''}
              </Text>
            </View>
            <View style={styles.summaryRightCell}>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Next deadline</Text>
              <Text style={[Typography.h3, { color: palette.text }]} numberOfLines={1}>
                {closestDeadlineLabel}
              </Text>
            </View>
          </View>

          {/* Task List */}
          <View style={styles.listSection}>
            <SectionHeader
              title={
                STATUS_TABS.find((t) => t.key === state.filterStatus)?.label ?? 'Tasks'
              }
              rightMeta={`${filteredTasks.length} item${filteredTasks.length === 1 ? '' : 's'}`}
            />

            {state.error ? (
              <ErrorState message={state.error} onRetry={() => void state.loadTasks()} />
            ) : state.loading && state.tasks.length === 0 ? (
              <LoadingSkeleton lines={4} />
            ) : filteredTasks.length > 0 ? (
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
            ) : (
              <EmptyState
                icon={state.filterStatus === 'overdue' ? 'shield' : 'check'}
                title={
                  state.filterStatus === 'overdue'
                    ? 'No overdue tasks'
                    : state.searchQuery
                      ? 'No matching tasks'
                      : 'Nothing here yet'
                }
                description={
                  state.filterStatus === 'overdue'
                    ? 'Nice work staying ahead of your deadlines.'
                    : 'Add a task with an optional deadline and estimated duration to plan your focus.'
                }
                actionLabel="Add a task"
                onAction={() => router.push('/tasks/create')}
              />
            )}
          </View>
        </View>
      </ScrollView>
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
  searchBox: {
    minHeight: 46,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  filterBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  categoryScroll: {
    gap: Spacing.xs + 2,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  sortChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radii.xs,
  },
  summaryCard: {
    marginTop: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md + 2,
    flexDirection: 'row',
  },
  summaryCell: {
    flex: 1,
    borderRightWidth: 1,
    paddingRight: Spacing.md,
    gap: 2,
  },
  summaryRightCell: {
    flex: 1,
    paddingLeft: Spacing.md,
    gap: 2,
  },
  listSection: {
    marginTop: Spacing.xl,
  },
  cardStack: {
    gap: Spacing.md,
  },
});
