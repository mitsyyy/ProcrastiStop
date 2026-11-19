import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Task } from '@/types/task';
import { AppIcon } from '../ui/AppIcon';
import { DeadlineBadge } from './DeadlineBadge';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onToggleComplete: () => void;
  onStartFocus?: () => void;
}

export function TaskCard({
  task,
  onPress,
  onToggleComplete,
  onStartFocus,
}: TaskCardProps) {
  const palette = useAppTheme();
  const isDone = task.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.surfaceGlass,
          borderColor: palette.border,
          opacity: isDone ? 0.65 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Pressable
          onPress={onToggleComplete}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
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

        <View style={styles.titleBlock}>
          <Text
            style={[
              Typography.bodySemiBold,
              { color: palette.text, fontSize: 15 },
              isDone && styles.strikethrough,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text style={[Typography.caption, { color: palette.textMuted }]} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
        </View>

        {onStartFocus && !isDone && task.status !== 'cancelled' ? (
          <Pressable
            onPress={onStartFocus}
            hitSlop={8}
            accessibilityLabel={`Start focus session for ${task.title}`}
            style={[styles.focusBtn, { backgroundColor: palette.sageTint }]}
          >
            <AppIcon name="play" size={14} color={palette.accentMint} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.badgeRow}>
        <DeadlineBadge task={task} compact />
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <View style={[styles.catChip, { backgroundColor: palette.surfaceMuted }]}>
          <Text style={[Typography.small, { color: palette.textMuted }]}>{task.category}</Text>
        </View>
        {task.estimatedMinutes ? (
          <Text style={[Typography.small, { color: palette.textMuted }]}>
            {task.estimatedMinutes}m
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: Radii.xs,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  focusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
});
