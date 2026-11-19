import { StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { TaskStatus } from '@/types/task';

interface StatusBadgeProps {
  status: TaskStatus;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const palette = useAppTheme();

  const bg =
    status === 'completed'
      ? palette.successSoft
      : status === 'in_progress'
        ? palette.warningSoft
        : status === 'cancelled'
          ? palette.dangerSoft
          : palette.surfaceMuted;

  const textColor =
    status === 'completed'
      ? palette.successText
      : status === 'in_progress'
        ? palette.warningText
        : status === 'cancelled'
          ? palette.dangerText
          : palette.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[Typography.small, styles.text, { color: textColor }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
});
