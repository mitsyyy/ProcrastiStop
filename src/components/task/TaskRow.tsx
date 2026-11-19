import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Task } from '@/types/task';
import { formatDeadlineLabel, getTaskDeadlineState } from '@/utils/date';
import { AppIcon } from '../ui/AppIcon';

interface TaskRowProps {
  task: Task;
  onToggleComplete: () => void;
  onPress: () => void;
  isLast?: boolean;
}

export function TaskRow({ task, onToggleComplete, onPress, isLast = false }: TaskRowProps) {
  const palette = useAppTheme();
  const isDone = task.status === 'completed';
  const deadlineState = getTaskDeadlineState(task);

  const dotColor =
    deadlineState === 'overdue'
      ? palette.dangerText
      : deadlineState === 'due_soon'
        ? palette.warningText
        : palette.textMuted;

  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.borderSubtle },
        isDone && styles.completedRow,
      ]}
    >
      <Pressable
        onPress={onToggleComplete}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        accessibilityLabel={`Mark ${task.title} complete`}
        style={[
          styles.checkbox,
          {
            borderColor: isDone ? palette.success : palette.textMuted,
            backgroundColor: isDone ? palette.success : 'transparent',
          },
        ]}
      >
        {isDone ? <AppIcon name="check" size={14} color="#ffffff" strokeWidth={2.4} /> : null}
      </Pressable>

      <Pressable onPress={onPress} style={styles.content}>
        <Text
          style={[
            Typography.bodySemiBold,
            { color: palette.text },
            isDone && styles.completedTitle,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[Typography.small, { color: dotColor }]} numberOfLines={1}>
            {formatDeadlineLabel(task.deadline)}
          </Text>
          <Text style={[Typography.small, { color: palette.textMuted }]}>· {task.category}</Text>
        </View>
      </Pressable>

      <Pressable onPress={onPress} hitSlop={8} style={styles.chevron}>
        <AppIcon name="chevron" size={16} color={palette.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  completedRow: {
    opacity: 0.58,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radii.xs,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chevron: {
    paddingLeft: Spacing.xs,
  },
});
