import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface ScreenBackgroundProps {
  children: ReactNode;
  variant?: 'home' | 'surface' | 'focus' | 'checkpoint';
  style?: ViewStyle;
}

export function ScreenBackground({
  children,
  variant = 'surface',
  style,
}: ScreenBackgroundProps) {
  const palette = useAppTheme();

  if (variant === 'checkpoint') {
    return (
      <View style={[styles.container, { backgroundColor: palette.checkpointBackground }, style]}>
        {children}
      </View>
    );
  }

  const colors =
    variant === 'focus'
      ? palette.activeFocusGradient
      : variant === 'home'
        ? palette.backgroundGradient
        : palette.surfaceGradient;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {(palette.mode === 'dark' || variant === 'focus') && (
        <>
          <View style={styles.glowTopRight} pointerEvents="none" />
          <View style={styles.glowMidLeft} pointerEvents="none" />
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(24, 184, 114, 0.16)',
  },
  glowMidLeft: {
    position: 'absolute',
    top: '32%',
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(13, 105, 72, 0.18)',
  },
});
