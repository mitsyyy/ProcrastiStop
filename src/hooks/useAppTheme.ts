import { useColorScheme } from 'react-native';

import { getThemePalette, type ThemePalette } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

export function useAppTheme(): ThemePalette {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.preferences.theme);
  return getThemePalette(themePreference, systemScheme);
}
