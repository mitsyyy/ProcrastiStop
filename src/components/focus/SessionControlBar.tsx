import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from '../ui/AppIcon';

interface SessionControlBarProps {
  isRunning: boolean;
  onTogglePause: () => void;
  onEndSession: () => void;
  onTriggerCheckpoint?: () => void;
  checkpointEnabled?: boolean;
}

export function SessionControlBar({
  isRunning,
  onTogglePause,
  onEndSession,
  onTriggerCheckpoint,
  checkpointEnabled = true,
}: SessionControlBarProps) {
  const palette = useAppTheme();

  return (
    <View style={styles.row}>
      {onTriggerCheckpoint ? (
        <Pressable
          onPress={onTriggerCheckpoint}
          style={({ pressed }) => [styles.sideControl, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open camera checkpoint"
        >
          <View style={styles.sideCircle}>
            <AppIcon name="camera" size={20} color="#ffffff" />
          </View>
          <Text style={[Typography.small, styles.sideLabel]} numberOfLines={1}>
            {checkpointEnabled ? 'Checkpoint' : 'Check in'}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onTogglePause}
        style={({ pressed }) => [styles.mainControl, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={isRunning ? 'Pause session' : 'Resume session'}
      >
        <LinearGradient
          colors={palette.energyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.mainCircle, Shadows.energyButton]}
        >
          <AppIcon name={isRunning ? 'pause' : 'play'} size={28} color="#ffffff" strokeWidth={2.2} />
        </LinearGradient>
        <Text style={[Typography.caption, styles.mainLabel]} numberOfLines={1}>
          {isRunning ? 'Pause' : 'Resume'}
        </Text>
      </Pressable>

      <Pressable
        onPress={onEndSession}
        style={({ pressed }) => [styles.sideControl, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="End focus session"
      >
        <View style={[styles.sideCircle, styles.endCircle]}>
          <AppIcon name="square" size={18} color="#ff9d8d" />
        </View>
        <Text style={[Typography.small, styles.sideLabel]} numberOfLines={1}>
          End
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  sideControl: {
    minWidth: 72,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sideCircle: {
    width: 50,
    height: 50,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCircle: {
    backgroundColor: 'rgba(224, 77, 61, 0.2)',
    borderColor: 'rgba(255, 157, 141, 0.42)',
  },
  sideLabel: {
    color: 'rgba(255, 255, 255, 0.84)',
    fontWeight: '600',
  },
  mainControl: {
    minWidth: 78,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainCircle: {
    width: 68,
    height: 68,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.88,
  },
});
