import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface LoadingSkeletonProps {
  lines?: number;
  style?: ViewStyle;
}

export function LoadingSkeleton({ lines = 3, style }: LoadingSkeletonProps) {
  const palette = useAppTheme();
  const [pulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.stack, style]}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.card,
            {
              opacity: pulse,
              backgroundColor: palette.surfaceGlass,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={[styles.barWide, { backgroundColor: palette.surfaceGlassStrong }]} />
          <View style={[styles.barNarrow, { backgroundColor: palette.surfaceGlassStrong }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  barWide: {
    height: 14,
    width: '72%',
    borderRadius: Radii.xs,
  },
  barNarrow: {
    height: 10,
    width: '44%',
    borderRadius: Radii.xs,
  },
});
