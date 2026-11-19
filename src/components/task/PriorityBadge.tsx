import { StyleSheet, Text, View } from 'react-native';

import { Radii, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { TaskPriority } from '@/types/task';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const palette = useAppTheme();

  const label =
    priority === 'high' ? 'High priority' : priority === 'medium' ? 'Medium' : 'Low';

  const bg =
    priority === 'high'
      ? palette.dangerSoft
      : priority === 'medium'
        ? palette.warningSoft
        : palette.sageTint;

  const textColor =
    priority === 'high'
      ? palette.dangerText
      : priority === 'medium'
        ? palette.warningText
        : palette.sageText;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[Typography.small, styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '700',
  },
});
