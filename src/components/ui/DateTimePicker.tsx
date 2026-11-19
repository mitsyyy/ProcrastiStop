import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatFullDateTime } from '@/utils/date';
import { AppIcon } from './AppIcon';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

interface DateTimePickerProps {
  label: string;
  value: string | null;
  onChange: (isoOrNull: string | null) => void;
  containerStyle?: ViewStyle;
}

function getPresetDate(daysAhead: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  containerStyle,
}: DateTimePickerProps) {
  const palette = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() =>
    value ? new Date(value) : getPresetDate(0, 20, 0),
  );

  const openModal = () => {
    const initial =
      value && !Number.isNaN(new Date(value).getTime())
        ? new Date(value)
        : getPresetDate(0, 20, 0);
    setDraftDate(initial);
    setOpen(true);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
        {label}
      </Text>

      <Pressable
        onPress={openModal}
        style={[
          styles.trigger,
          { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
        ]}
      >
        <AppIcon name="calendar" size={18} color={palette.textMuted} />
        <Text
          style={[
            Typography.body,
            styles.triggerText,
            { color: value ? palette.text : palette.textMuted },
          ]}
          numberOfLines={1}
        >
          {value ? formatFullDateTime(value) : 'No deadline (flexible schedule)'}
        </Text>
        <AppIcon name="chevron" size={16} color={palette.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlayBackdrop }]}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[Typography.h3, { color: palette.text }]}>Select Deadline</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>

            <View style={styles.presetRow}>
              <Pressable
                onPress={() => setDraftDate(getPresetDate(0, 20, 0))}
                style={[
                  styles.presetChip,
                  { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                ]}
              >
                <Text style={[Typography.small, { color: palette.text }]}>Today 8 PM</Text>
              </Pressable>
              <Pressable
                onPress={() => setDraftDate(getPresetDate(1, 10, 0))}
                style={[
                  styles.presetChip,
                  { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                ]}
              >
                <Text style={[Typography.small, { color: palette.text }]}>Tomorrow 10 AM</Text>
              </Pressable>
              <Pressable
                onPress={() => setDraftDate(getPresetDate(3, 18, 0))}
                style={[
                  styles.presetChip,
                  { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
                ]}
              >
                <Text style={[Typography.small, { color: palette.text }]}>In 3 days</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.previewPanel,
                { backgroundColor: palette.sageTint, borderColor: palette.border },
              ]}
            >
              <Text style={[Typography.small, { color: palette.textMuted }]}>Selected deadline</Text>
              <Text style={[Typography.bodySemiBold, { color: palette.text, marginTop: 2 }]}>
                {formatFullDateTime(draftDate.toISOString())}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <SecondaryButton
                title="No deadline"
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={styles.flexOne}
              />
              <PrimaryButton
                title="Apply"
                onPress={() => {
                  onChange(draftDate.toISOString());
                  setOpen(false);
                }}
                fullWidth={false}
                style={styles.flexOne}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontWeight: '600' },
  trigger: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  triggerText: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  sheet: { borderRadius: Radii.xl, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  previewPanel: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  flexOne: { flex: 1 },
});
