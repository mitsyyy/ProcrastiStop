import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function ToggleSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: ToggleSwitchProps) {
  const palette = useAppTheme();

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          backgroundColor: value
            ? palette.primary
            : palette.mode === 'dark'
              ? 'rgba(255,255,255,0.2)'
              : '#cfd4cf',
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: value ? 19 : 0 }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 27,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },
});
