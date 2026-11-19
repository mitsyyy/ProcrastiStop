import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface PermissionExplainerProps {
  icon: AppIconName;
  title: string;
  description: string;
  privacyNote: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  style?: ViewStyle;
}

export function PermissionExplainer({
  icon,
  title,
  description,
  privacyNote,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  style,
}: PermissionExplainerProps) {
  const palette = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
        style,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.sageTint }]}>
        <AppIcon name={icon} size={30} color={palette.accentMint} />
      </View>
      <Text style={[Typography.h2, { color: palette.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[Typography.body, styles.desc, { color: palette.textSecondary }]}>
        {description}
      </Text>
      <View
        style={[
          styles.privacyBox,
          { backgroundColor: palette.surfaceMuted, borderColor: palette.borderSubtle },
        ]}
      >
        <AppIcon name="lock" size={14} color={palette.accentMint} />
        <Text style={[Typography.small, { color: palette.textMuted, flex: 1 }]}>
          {privacyNote}
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton title={primaryLabel} onPress={onPrimaryPress} tone="energy" />
        {secondaryLabel && onSecondaryPress ? (
          <SecondaryButton title={secondaryLabel} onPress={onSecondaryPress} fullWidth />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    textAlign: 'center',
  },
  privacyBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
