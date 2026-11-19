import { StyleSheet, Text, View } from 'react-native';

import { Typography } from '@/constants/theme';
import { getSessionProgressRatio } from '@/features/focus/focusUtils';
import type { SessionStatus } from '@/types/focus';
import { formatCountdown } from '@/utils/date';
import { TimerRing } from './TimerRing';

interface FocusTimerProps {
  remainingSeconds: number;
  plannedDurationMinutes: number;
  status: SessionStatus;
  size?: number;
}

export function FocusTimer({
  remainingSeconds,
  plannedDurationMinutes,
  status,
  size = 248,
}: FocusTimerProps) {
  const progress = getSessionProgressRatio(plannedDurationMinutes, remainingSeconds);
  const statusLabel =
    status === 'paused'
      ? 'Paused'
      : status === 'checkpoint'
        ? 'Checkpoint'
        : 'Time remaining';

  return (
    <TimerRing progress={progress} size={size}>
      <View style={styles.inner}>
        <Text style={[Typography.small, styles.statusText]}>{statusLabel}</Text>
        <Text style={[Typography.heroTimer, styles.timeText]}>
          {formatCountdown(remainingSeconds)}
        </Text>
        <Text style={[Typography.small, styles.plannedText]}>
          of {plannedDurationMinutes} minutes
        </Text>
      </View>
    </TimerRing>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.64)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeText: {
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  plannedText: {
    color: 'rgba(255, 255, 255, 0.54)',
  },
});
