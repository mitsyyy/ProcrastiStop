import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: AppIconName;
  tone?: 'emerald' | 'energy' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  tone = 'emerald',
  disabled = false,
  loading = false,
  fullWidth = true,
  compact = false,
  style,
}: PrimaryButtonProps) {
  const palette = useAppTheme();
  const isDisabled = disabled || loading;

  const gradientColors: readonly [string, string] =
    tone === 'energy'
      ? palette.energyGradient
      : tone === 'danger'
        ? ['#d85858', palette.danger]
        : palette.primaryGradient;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.wrapper,
        fullWidth && styles.fullWidth,
        tone === 'energy' && !isDisabled ? Shadows.energyButton : Shadows.card,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabledWrapper,
        style,
      ]}
    >
      <LinearGradient
        colors={
          isDisabled
            ? palette.mode === 'dark'
              ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)']
              : ['#d7dbd7', '#cfd4cf']
            : gradientColors
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, compact && styles.compactGradient]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            {icon && (
              <AppIcon
                name={icon}
                size={18}
                color={isDisabled ? palette.textMuted : '#ffffff'}
              />
            )}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[
                Typography.label,
                styles.label,
                compact && styles.compactLabel,
                { color: isDisabled ? palette.textMuted : '#ffffff' },
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  disabledWrapper: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    minHeight: 50,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  compactGradient: {
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
  },
  compactLabel: {
    fontSize: 13,
  },
});
