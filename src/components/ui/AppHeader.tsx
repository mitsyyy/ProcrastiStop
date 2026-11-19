import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { IconButton } from './IconButton';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  style?: ViewStyle;
}

export function AppHeader({ title, subtitle, onBack, right, style }: AppHeaderProps) {
  const palette = useAppTheme();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.row}>
        {onBack && (
          <IconButton
            icon="arrow"
            onPress={onBack}
            accessibilityLabel="Go back"
          />
        )}
        <View style={styles.copy}>
          <Text style={[Typography.h1, { color: palette.text }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[Typography.body, { color: palette.textMuted, marginTop: 3 }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.actions}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
