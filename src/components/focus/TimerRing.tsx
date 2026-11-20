import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

import { useAppTheme } from '@/hooks/useAppTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}

export function TimerRing({
  progress,
  size = 240,
  strokeWidth = 11,
  children,
}: TimerRingProps) {
  const palette = useAppTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedRemaining = useSharedValue(clamped);

  useEffect(() => {
    animatedRemaining.value = withTiming(clamped, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, animatedRemaining]);

  const animatedCircleProps = useAnimatedProps(() => {
    const remaining = Math.min(1, Math.max(0, animatedRemaining.value));
    const elapsed = 1 - remaining;
    return {
      strokeDashoffset: -circumference * elapsed,
      strokeOpacity: remaining <= 0.002 ? 0 : 1,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="focusRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.energyYellow} />
            <Stop offset="100%" stopColor={palette.energyOrange} />
          </SvgGradient>
        </Defs>

        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth={strokeWidth}
          fill="rgba(16, 63, 49, 0.68)"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#focusRingGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap={clamped >= 0.998 ? 'butt' : 'round'}
          transform={`rotate(-90 ${center} ${center})`}
          animatedProps={animatedCircleProps}
        />
      </Svg>

      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
