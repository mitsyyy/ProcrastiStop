import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: AppIconName;
  variant?: 'outline' | 'ghost' | 'dangerOutline';
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function SecondaryButton({
  title,
  onPress,
  icon,
  variant = 'outline',
  disabled = false,
  fullWidth = false,
  compact = false,
  style,
}: SecondaryButtonProps) {
  const palette = useAppTheme();

  const textColor =
    variant === 'dangerOutline'
      ? palette.dangerText
      : variant === 'ghost'
        ? palette.accentMint
        : palette.text;

  const borderColor =
    variant === 'dangerOutline'
      ? palette.dangerSoft
      : variant === 'ghost'
        ? 'transparent'
        : palette.border;

  const backgroundColor =
    variant === 'dangerOutline'
      ? palette.dangerSoft
      : variant === 'ghost'
        ? 'transparent'
        : palette.surfaceGlass;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        fullWidth && styles.fullWidth,
        { borderColor, backgroundColor },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <AppIcon name={icon} size={17} color={textColor} />}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[
          Typography.label,
          styles.label,
          compact && styles.compactLabel,
          { color: textColor },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  compactButton: {
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  label: {
    textAlign: 'center',
  },
  compactLabel: {
    fontSize: 13,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
