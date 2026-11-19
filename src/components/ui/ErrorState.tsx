import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from './AppIcon';
import { SecondaryButton } from './SecondaryButton';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  style,
}: ErrorStateProps) {
  const palette = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
        style,
      ]}
    >
      <View style={styles.iconCircle}>
        <AppIcon name="alert" size={24} color={palette.dangerText} />
      </View>
      <Text style={[Typography.h3, { color: palette.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Typography.caption, { color: palette.textSecondary, textAlign: 'center' }]}>
        {message}
      </Text>
      {onRetry ? (
        <SecondaryButton
          title="Try again"
          icon="refresh"
          onPress={onRetry}
          style={styles.retryBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 80, 80, 0.14)',
  },
  retryBtn: {
    marginTop: Spacing.xs,
  },
});
