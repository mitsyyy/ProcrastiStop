import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { getPermissionStatusLabel } from '@/features/app-blocker/blockerMeta';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { BlockerPermissionStatus } from '@/types/blocker';
import { AppIcon } from '../ui/AppIcon';

interface BlockerStatusCardProps {
  title: string;
  description: string;
  settingPath: string;
  status: BlockerPermissionStatus;
  onRequest?: () => void;
  onCycleDemoState?: () => void;
}

export function BlockerStatusCard({
  title,
  description,
  settingPath,
  status,
  onRequest,
  onCycleDemoState,
}: BlockerStatusCardProps) {
  const palette = useAppTheme();

  const statusColors =
    status === 'granted'
      ? { bg: palette.successSoft, text: palette.successText, icon: 'check' as const }
      : status === 'unavailable'
        ? { bg: palette.dangerSoft, text: palette.dangerText, icon: 'alert' as const }
        : { bg: palette.warningSoft, text: palette.warningText, icon: 'shield' as const };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[Typography.bodySemiBold, { color: palette.text }]}>{title}</Text>
          <Text style={[Typography.small, { color: palette.textMuted }]}>
            Simulated Android permission
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
          <AppIcon name={statusColors.icon} size={12} color={statusColors.text} />
          <Text style={[Typography.small, { color: statusColors.text, fontWeight: '700' }]}>
            {getPermissionStatusLabel(status)}
          </Text>
        </View>
      </View>

      <Text style={[Typography.caption, { color: palette.textSecondary }]}>{description}</Text>

      <Text style={[Typography.small, { color: palette.textMuted }]}>{settingPath}</Text>

      <View style={styles.actions}>
        {status === 'not_granted' && onRequest ? (
          <Pressable
            onPress={onRequest}
            style={[styles.actionBtn, { backgroundColor: palette.sageTint }]}
          >
            <Text style={[Typography.small, { color: palette.accentMint, fontWeight: '700' }]}>
              Simulate Grant
            </Text>
          </Pressable>
        ) : null}

        {onCycleDemoState ? (
          <Pressable
            onPress={onCycleDemoState}
            style={[
              styles.actionBtn,
              {
                backgroundColor: palette.surfaceMuted,
                borderWidth: 1,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[Typography.small, { color: palette.textSecondary, fontWeight: '600' }]}>
              Cycle state ({getPermissionStatusLabel(status)})
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
});
