import { StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { BlockedAppItem } from '@/types/blocker';
import { AppIcon } from '../ui/AppIcon';

interface BlockedAppRowProps {
  item: BlockedAppItem;
  isActive?: boolean;
}

const APP_BADGE_COLORS: Record<string, string> = {
  'com.instagram.android': '#c13584',
  'com.facebook.katana': '#1877f2',
  'com.zhiliaoapp.musically': '#1f1f1f',
  'com.google.android.youtube': '#cd4c45',
  'com.twitter.android': '#222222',
  'com.discord': '#5865f2',
};

export function BlockedAppRow({ item, isActive = false }: BlockedAppRowProps) {
  const palette = useAppTheme();
  const badgeBg = APP_BADGE_COLORS[item.packageName] ?? palette.primary;

  return (
    <View style={[styles.row, { borderBottomColor: palette.borderSubtle }]}>
      <View style={[styles.appTile, { backgroundColor: badgeBg }]}>
        <Text style={styles.tileLetter}>{item.displayName.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[Typography.bodySemiBold, { color: palette.text }]}>{item.displayName}</Text>
        <Text style={[Typography.small, { color: palette.textMuted }]} numberOfLines={1}>
          {item.packageName}
        </Text>
      </View>
      <View
        style={[
          styles.pill,
          { backgroundColor: isActive ? palette.sageTint : palette.surfaceMuted },
        ]}
      >
        <AppIcon
          name="shield"
          size={12}
          color={isActive ? palette.accentMint : palette.textMuted}
        />
        <Text
          style={[
            Typography.small,
            { color: isActive ? palette.accentMint : palette.textMuted, fontWeight: '700' },
          ]}
        >
          {isActive ? 'Restricted' : 'Standby'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appTile: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLetter: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
});
