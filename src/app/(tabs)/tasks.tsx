import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  { key: 'skipped', label: 'Skipped' },
  { key: 'missed', label: 'Missed' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

const SORT_OPTIONS: { key: TaskSortBy; label: string }[] = [
  { key: 'deadline', label: 'Deadline' },
  { key: 'priority', label: 'Priority' },
  { key: 'recent', label: 'Recent' },
];

type ActiveFilterSheet = 'status' | 'category' | null;

export default function TasksScreen() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const [showSearch, setShowSearch] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveFilterSheet>(null);

  const state = useTaskStore();
  const filteredTasks = useMemo(() => selectFilteredSortedTasks(state), [state]);

  const openTasks = useMemo(
    () =>
      state.tasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'missed',
      ),
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

  const activeStatusLabel =
    STATUS_TABS.find((t) => t.key === state.filterStatus)?.label ?? 'All';
  const categoryOptions = ['All', ...TASK_CATEGORIES];
  const hasActiveFilter = state.filterStatus !== 'all' || state.filterCategory !== 'All';

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

          {/* Compact Side-by-Side Dropdown Filters (Zero Text Truncation) */}
          <View style={styles.filterDropdownRow}>
            <Pressable
              onPress={() => setActiveSheet('status')}
              accessibilityRole="button"
              accessibilityLabel="Filter by task status"
              style={[
                styles.dropdownBtn,
                {
                  backgroundColor:
                    state.filterStatus !== 'all' ? palette.sageTint : palette.surfaceGlass,
                  borderColor:
                    state.filterStatus !== 'all' ? palette.accentMint : palette.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  Typography.caption,
                  styles.dropdownText,
                  {
                    color:
                      state.filterStatus !== 'all' ? palette.accentMint : palette.text,
                    fontWeight: '700',
                  },
                ]}
              >
                Status: {activeStatusLabel}
              </Text>
              <AppIcon
                name="chevronDown"
                size={16}
                color={state.filterStatus !== 'all' ? palette.accentMint : palette.textMuted}
              />
            </Pressable>

            <Pressable
              onPress={() => setActiveSheet('category')}
              accessibilityRole="button"
              accessibilityLabel="Filter by task category"
              style={[
                styles.dropdownBtn,
                {
                  backgroundColor:
                    state.filterCategory !== 'All' ? palette.sageTint : palette.surfaceGlass,
                  borderColor:
                    state.filterCategory !== 'All' ? palette.accentMint : palette.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  Typography.caption,
                  styles.dropdownText,
                  {
                    color:
                      state.filterCategory !== 'All' ? palette.accentMint : palette.text,
                    fontWeight: '700',
                  },
                ]}
              >
                Category: {state.filterCategory}
              </Text>
              <AppIcon
                name="chevronDown"
                size={16}
                color={state.filterCategory !== 'All' ? palette.accentMint : palette.textMuted}
              />
            </Pressable>
          </View>

          {/* Tactile "Sort by" Pill Buttons & Quick Reset */}
          <View style={styles.sortRow}>
            <Text style={[Typography.caption, { color: palette.textMuted, fontWeight: '600' }]}>
              Sort by:
            </Text>
            <View style={styles.sortChipsWrap}>
              {SORT_OPTIONS.map((opt) => {
                const active = state.sortBy === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => state.setSortBy(opt.key)}
                    style={({ pressed }) => [
                      styles.sortChip,
                      {
                        backgroundColor: active
                          ? palette.mode === 'dark'
                            ? '#3ecf89'
                            : palette.primary
                          : palette.surfaceGlass,
                        borderColor: active
                          ? palette.mode === 'dark'
                            ? '#3ecf89'
                            : palette.primary
                          : palette.border,
                      },
                      pressed && styles.sortChipPressed,
                    ]}
                  >
                    <Text
                      style={[
                        Typography.small,
                        {
                          color: active
                            ? palette.mode === 'dark'
                              ? '#071b18'
                              : '#ffffff'
                            : palette.textSecondary,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {hasActiveFilter ? (
              <Pressable
                onPress={() => {
                  state.setFilterStatus('all');
                  state.setFilterCategory('All');
                }}
                hitSlop={8}
              >
                <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
                  Reset
                </Text>
              </Pressable>
            ) : null}
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
                state.filterStatus === 'all' && state.filterCategory === 'All'
                  ? 'All Tasks'
                  : `${activeStatusLabel}${state.filterCategory !== 'All' ? ` · ${state.filterCategory}` : ''}`
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
                    : state.searchQuery || hasActiveFilter
                      ? 'No matching tasks'
                      : 'Nothing here yet'
                }
                description={
                  state.filterStatus === 'overdue'
                    ? 'Nice work staying ahead of your deadlines.'
                    : 'Add a task with a deadline and focus start time to stay ahead.'
                }
                actionLabel="Add a task"
                onAction={() => router.push('/tasks/create')}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Filter Selection Bottom Sheet / Modal */}
      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveSheet(null)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setActiveSheet(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalSheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[Typography.h3, { color: palette.text }]}>
                {activeSheet === 'status' ? 'Filter by Status' : 'Filter by Category'}
              </Text>
              <Pressable onPress={() => setActiveSheet(null)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            >
              {activeSheet === 'status'
                ? STATUS_TABS.map((opt) => {
                    const selected = state.filterStatus === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => {
                          state.setFilterStatus(opt.key);
                          setActiveSheet(null);
                        }}
                        style={[
                          styles.optionRow,
                          {
                            backgroundColor: selected ? palette.sageTint : 'transparent',
                            borderColor: palette.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.bodySemiBold,
                            { color: selected ? palette.accentMint : palette.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {selected ? (
                          <AppIcon name="check" size={18} color={palette.accentMint} />
                        ) : null}
                      </Pressable>
                    );
                  })
                : categoryOptions.map((cat) => {
                    const selected = state.filterCategory === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          state.setFilterCategory(cat);
                          setActiveSheet(null);
                        }}
                        style={[
                          styles.optionRow,
                          {
                            backgroundColor: selected ? palette.sageTint : 'transparent',
                            borderColor: palette.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.bodySemiBold,
                            { color: selected ? palette.accentMint : palette.text },
                          ]}
                        >
                          {cat}
                        </Text>
                        {selected ? (
                          <AppIcon name="check" size={18} color={palette.accentMint} />
                        ) : null}
                      </Pressable>
                    );
                  })}
            </ScrollView>
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
  filterDropdownRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
  },
  dropdownBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  dropdownText: {
    flex: 1,
  },
  sortRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sortChipsWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  sortChipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  modalSheet: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    maxHeight: '65%',
    gap: Spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalList: {
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
