import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { BlockedAppItem } from '@/types/blocker';
import { ToggleSwitch } from '../ui/ToggleSwitch';

interface AppSelectionItemProps {
  item: BlockedAppItem;
  onToggle: () => void;
  disabled?: boolean;
  isLast?: boolean;
}

const APP_BADGE_COLORS: Record<string, string> = {
  'com.instagram.android': '#c13584',
  'com.facebook.katana': '#1877f2',
  'com.zhiliaoapp.musically': '#1f1f1f',
  'com.google.android.youtube': '#cd4c45',
  'com.twitter.android': '#222222',
  'com.discord': '#5865f2',
};

export function AppSelectionItem({
  item,
  onToggle,
  disabled = false,
  isLast = false,
}: AppSelectionItemProps) {
  const palette = useAppTheme();
  const tileBg = APP_BADGE_COLORS[item.packageName] ?? palette.primary;

  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.borderSubtle,
        },
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.appTile, { backgroundColor: tileBg }]}>
        <Text style={styles.tileText}>{item.displayName.slice(0, 2).toUpperCase()}</Text>
      </View>

      <View style={styles.copy}>
        <Text style={[Typography.bodySemiBold, { color: palette.text }]}>{item.displayName}</Text>
        <Text style={[Typography.small, { color: palette.textMuted }]} numberOfLines={1}>
          {item.packageName}
        </Text>
      </View>

      <ToggleSwitch
        value={item.selected}
        onValueChange={onToggle}
        disabled={disabled}
        accessibilityLabel={`Restrict ${item.displayName}`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  appTile: {
    width: 38,
    height: 38,
    borderRadius: Radii.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
