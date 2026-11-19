import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: AppIconName;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon = 'clock',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const palette = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.dialog,
            { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: destructive ? palette.dangerSoft : palette.warningSoft,
              },
            ]}
          >
            <AppIcon
              name={icon}
              size={24}
              color={destructive ? palette.dangerText : palette.warningText}
            />
          </View>
          <Text style={[Typography.h2, { color: palette.text, textAlign: 'center' }]}>
            {title}
          </Text>
          <Text style={[Typography.body, styles.desc, { color: palette.textMuted }]}>
            {description}
          </Text>
          <View style={styles.actions}>
            <SecondaryButton title={cancelLabel} onPress={onCancel} style={styles.actionBtn} />
            <PrimaryButton
              title={confirmLabel}
              onPress={onConfirm}
              tone={destructive ? 'danger' : 'emerald'}
              fullWidth={false}
              style={styles.actionBtn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  desc: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
});
