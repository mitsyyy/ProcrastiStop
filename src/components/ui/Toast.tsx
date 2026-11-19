import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/settingsStore';
import { AppIcon } from './AppIcon';

export function Toast() {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const toast = useSettingsStore((s) => s.toast);
  const hideToast = useSettingsStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  const toneColor =
    toast.tone === 'success'
      ? palette.successText
      : toast.tone === 'warning'
        ? palette.warningText
        : toast.tone === 'error'
          ? palette.dangerText
          : palette.accentMint;

  const iconName =
    toast.tone === 'success'
      ? 'check'
      : toast.tone === 'warning' || toast.tone === 'error'
        ? 'alert'
        : 'bell';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: Math.max(insets.top + 8, 18) }]}
    >
      <Pressable
        onPress={hideToast}
        style={[
          styles.toast,
          Shadows.card,
          {
            backgroundColor: palette.surfaceElevated,
            borderColor: toneColor,
          },
        ]}
      >
        <AppIcon name={iconName} size={18} color={toneColor} />
        <Text style={[Typography.caption, styles.message, { color: palette.text }]}>
          {toast.message}
        </Text>
        <AppIcon name="close" size={14} color={palette.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 460,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
  },
});
