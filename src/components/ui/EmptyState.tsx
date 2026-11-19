import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon?: AppIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'check',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const palette = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: palette.sageTint }]}>
        <AppIcon name={icon} size={26} color={palette.accentMint} />
      </View>
      <Text style={[Typography.h3, { color: palette.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Typography.caption, styles.desc, { color: palette.textMuted }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  desc: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  button: {
    marginTop: Spacing.sm,
  },
});
