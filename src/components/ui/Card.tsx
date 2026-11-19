import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
  noPadding?: boolean;
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', noPadding = false, style }: CardProps) {
  const palette = useAppTheme();

  const backgroundColor =
    variant === 'elevated'
      ? palette.surfaceGlassStrong
      : variant === 'subtle'
        ? palette.surfaceMuted
        : palette.surfaceGlass;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor: palette.border,
          padding: noPadding ? 0 : Spacing.lg,
        },
        variant === 'elevated' && Shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
