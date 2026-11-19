import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from '../ui/AppIcon';

interface SessionControlBarProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onEndSession: () => void;
  onTriggerCheckpoint?: () => void;
  checkpointEnabled?: boolean;
}

export function SessionControlBar({
  isPaused,
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
          accessibilityLabel="Open camera checkpoint"
        >
          <View style={styles.sideCircle}>
            <AppIcon name="camera" size={20} color="#ffffff" />
          </View>
          <Text style={[Typography.small, styles.sideLabel]}>
            {checkpointEnabled ? 'Checkpoint' : 'Check in'}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onTogglePause}
        style={({ pressed }) => [styles.mainControl, pressed && styles.pressed]}
        accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
      >
        <LinearGradient
          colors={palette.energyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.mainCircle, Shadows.energyButton]}
        >
          <AppIcon name={isPaused ? 'play' : 'pause'} size={28} color="#ffffff" />
        </LinearGradient>
        <Text style={[Typography.caption, styles.mainLabel]}>
          {isPaused ? 'Resume' : 'Pause'}
        </Text>
      </Pressable>

      <Pressable
        onPress={onEndSession}
        style={({ pressed }) => [styles.sideControl, pressed && styles.pressed]}
        accessibilityLabel="End focus session"
      >
        <View style={styles.sideCircle}>
          <AppIcon name="square" size={18} color="#ffffff" />
        </View>
        <Text style={[Typography.small, styles.sideLabel]}>End</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxxl,
  },
  sideControl: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sideCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  mainControl: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
