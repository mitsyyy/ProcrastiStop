import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  rightMeta?: string;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  onActionPress,
  rightMeta,
  style,
}: SectionHeaderProps) {
  const palette = useAppTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        {eyebrow ? (
          <Text style={[Typography.eyebrow, { color: palette.textMuted, marginBottom: 2 }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[Typography.h2, { color: palette.text }]}>{title}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={[Typography.caption, { color: palette.accentMint, fontWeight: '700' }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : rightMeta ? (
        <Text style={[Typography.caption, { color: palette.textMuted }]}>{rightMeta}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  left: {
    flex: 1,
  },
});
