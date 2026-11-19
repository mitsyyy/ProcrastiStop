import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface DividerProps {
  style?: ViewStyle;
}

export function Divider({ style }: DividerProps) {
  const palette = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: palette.borderSubtle }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
