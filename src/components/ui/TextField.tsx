import { StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon, type AppIconName } from './AppIcon';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  optionalTag?: string;
  icon?: AppIconName;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
}

export function TextField({
  label,
  optionalTag,
  icon,
  error,
  helperText,
  multiline,
  containerStyle,
  ...inputProps
}: TextFieldProps) {
  const palette = useAppTheme();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
          {label}
        </Text>
        {optionalTag ? (
          <Text style={[Typography.small, { color: palette.textMuted }]}>{optionalTag}</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.inputBox,
          multiline && styles.multilineBox,
          {
            backgroundColor: palette.surfaceGlass,
            borderColor: error ? palette.danger : palette.border,
          },
        ]}
      >
        {icon && !multiline ? (
          <AppIcon name={icon} size={18} color={error ? palette.dangerText : palette.textMuted} />
        ) : null}
        <TextInput
          placeholderTextColor={palette.placeholder}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            Typography.body,
            styles.input,
            multiline && styles.multilineInput,
            { color: palette.text },
          ]}
          {...inputProps}
        />
      </View>

      {error ? (
        <Text style={[Typography.small, { color: palette.dangerText }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[Typography.small, { color: palette.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
  inputBox: {
    minHeight: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  multilineBox: {
    minHeight: 104,
    paddingVertical: Spacing.md,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 80,
    paddingVertical: 0,
  },
});
