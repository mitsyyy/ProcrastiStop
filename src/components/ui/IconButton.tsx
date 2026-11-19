import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Shadows } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';

interface IconButtonProps {
  icon: AppIconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'glass' | 'filledEnergy' | 'filledEmerald';
  size?: number;
  badgeDot?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'glass',
  size = 44,
  badgeDot = false,
  style,
}: IconButtonProps) {
  const palette = useAppTheme();

  if (variant !== 'glass') {
    const colors =
      variant === 'filledEnergy' ? palette.energyGradient : palette.primaryGradient;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.circle,
          { width: size, height: size, borderRadius: size / 2 },
          variant === 'filledEnergy' ? Shadows.energyButton : Shadows.card,
          pressed && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fillCenter, { borderRadius: size / 2 }]}
        >
          <AppIcon name={icon} size={Math.round(size * 0.46)} color="#ffffff" />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.circle,
        styles.glass,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: palette.border,
          backgroundColor: palette.surfaceGlass,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppIcon name={icon} size={Math.round(size * 0.45)} color={palette.text} />
      {badgeDot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: palette.energyOrange,
              borderColor: palette.mode === 'dark' ? '#0b3127' : '#ffffff',
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    position: 'relative',
  },
  glass: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillCenter: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
