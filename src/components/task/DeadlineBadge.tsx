import { StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Task } from '@/types/task';
import { formatDeadlineLabel, getTaskDeadlineState } from '@/utils/date';
import { AppIcon } from '../ui/AppIcon';

interface DeadlineBadgeProps {
  task: Task;
  compact?: boolean;
}

export function DeadlineBadge({ task, compact = false }: DeadlineBadgeProps) {
  const palette = useAppTheme();
  const state = getTaskDeadlineState(task);
  const label = formatDeadlineLabel(task.deadline);

  const bg =
    state === 'overdue'
      ? palette.dangerSoft
      : state === 'due_soon'
        ? palette.warningSoft
        : state === 'completed'
          ? palette.successSoft
          : palette.surfaceMuted;

  const color =
    state === 'overdue'
      ? palette.dangerText
      : state === 'due_soon'
        ? palette.warningText
        : state === 'completed'
          ? palette.successText
          : palette.textMuted;

  const prefix = state === 'overdue' ? 'Overdue' : state === 'due_soon' ? 'Due soon' : null;

  return (
    <View style={[styles.badge, compact && styles.compact, { backgroundColor: bg }]}>
      <AppIcon name="clock" size={11} color={color} />
      <Text style={[Typography.small, { color, fontWeight: '700' }]} numberOfLines={1}>
        {prefix && state !== 'overdue' ? `${prefix} · ${label}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
});
