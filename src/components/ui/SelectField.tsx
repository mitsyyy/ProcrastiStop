import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  subtitle?: string;
}

interface SelectFieldProps<T extends string = string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  icon?: AppIconName;
  containerStyle?: ViewStyle;
}

export function SelectField<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select option',
  icon,
  containerStyle,
}: SelectFieldProps<T>) {
  const palette = useAppTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((opt) => opt.value === value);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { backgroundColor: palette.surfaceGlass, borderColor: palette.border },
        ]}
      >
        {icon ? <AppIcon name={icon} size={18} color={palette.textMuted} /> : null}
        <Text
          style={[
            Typography.body,
            styles.valueText,
            { color: selected ? palette.text : palette.placeholder },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
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
              <Text style={[Typography.h3, { color: palette.text }]}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <AppIcon name="close" size={20} color={palette.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.optionRow,
                      {
                        borderColor: palette.borderSubtle,
                        backgroundColor: isSelected ? palette.sageTint : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.optionCopy}>
                      <Text
                        style={[
                          Typography.bodySemiBold,
                          { color: isSelected ? palette.accentMint : palette.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {opt.subtitle ? (
                        <Text style={[Typography.small, { color: palette.textMuted }]}>
                          {opt.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <AppIcon name="check" size={18} color={palette.accentMint} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  trigger: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  valueText: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  optionsList: {
    maxHeight: 320,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
});
