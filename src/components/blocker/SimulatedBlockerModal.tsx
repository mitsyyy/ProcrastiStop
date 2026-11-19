import { Modal, StyleSheet, Text, View } from 'react-native';

import { Radii, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatCountdown } from '@/utils/date';
import { AppIcon } from '../ui/AppIcon';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';

interface SimulatedBlockerModalProps {
  visible: boolean;
  appName: string;
  packageName: string;
  remainingSeconds: number;
  taskTitle: string;
  allowEmergencyExit: boolean;
  onReturnToFocus: () => void;
  onEmergencyExit?: () => void;
}

export function SimulatedBlockerModal({
  visible,
  appName,
  packageName,
  remainingSeconds,
  taskTitle,
  allowEmergencyExit,
  onReturnToFocus,
  onEmergencyExit,
}: SimulatedBlockerModalProps) {
  const palette = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onReturnToFocus}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}>
        <View
          style={[
            styles.card,
            Shadows.card,
            { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
          ]}
        >
          <View style={[styles.shieldCircle, { backgroundColor: palette.sageTint }]}>
            <AppIcon name="shield" size={36} color={palette.accentMint} />
          </View>

          <View style={[styles.simPill, { backgroundColor: palette.warningSoft }]}>
            <Text style={[Typography.small, { color: palette.warningText, fontWeight: '700' }]}>
              Frontend Simulation Preview
            </Text>
          </View>

          <Text style={[Typography.eyebrow, { color: palette.textMuted, marginTop: Spacing.xs }]}>
            FocusLock is active
          </Text>
          <Text style={[Typography.h2, styles.headline, { color: palette.text }]}>
            {appName} is paused during your session.
          </Text>
          <Text style={[Typography.body, styles.body, { color: palette.textSecondary }]}>
            Return to your focus block and finish this stretch before opening {appName}.
          </Text>

          <View
            style={[
              styles.infoBox,
              { borderColor: palette.border, backgroundColor: palette.surfaceMuted },
            ]}
          >
            <View style={[styles.infoCell, { borderRightWidth: 1, borderRightColor: palette.border }]}>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Remaining</Text>
              <Text style={[Typography.h3, { color: palette.text }]}>
                {formatCountdown(remainingSeconds)}
              </Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={[Typography.small, { color: palette.textMuted }]}>Current task</Text>
              <Text style={[Typography.bodySemiBold, { color: palette.text }]} numberOfLines={1}>
                {taskTitle}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              title="Return to Focus"
              icon="arrow"
              tone="energy"
              onPress={onReturnToFocus}
            />
            {allowEmergencyExit && onEmergencyExit ? (
              <SecondaryButton
                title="Emergency Exit (End Blocking)"
                variant="dangerOutline"
                onPress={onEmergencyExit}
                fullWidth
              />
            ) : null}
          </View>

          <Text style={[Typography.small, styles.footnote, { color: palette.textMuted }]}>
            Target package: {packageName}. Real OS-level interception on Android requires the Stage 2
            native Kotlin Usage Access & Overlay service.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radii.xl + 2,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  shieldCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  simPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  headline: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  infoCell: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  footnote: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 15,
  },
});
