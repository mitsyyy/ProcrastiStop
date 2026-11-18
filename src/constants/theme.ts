import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePalette {
  mode: ResolvedTheme;
  backgroundGradient: readonly [string, string, string];
  surfaceGradient: readonly [string, string, string];
  activeFocusGradient: readonly [string, string, string];
  checkpointBackground: string;
  backgroundSolid: string;
  surfaceGlass: string;
  surfaceGlassStrong: string;
  surfaceCardGradient: readonly [string, string];
  surfaceElevated: string;
  surfaceMuted: string;
  navBarBg: string;
  navBarBorder: string;
  stickyBarBg: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;
  primary: string;
  primaryDark: string;
  primaryGradient: readonly [string, string];
  primaryText: string;
  accentMint: string;
  accentMintSoft: string;
  energyOrange: string;
  energyYellow: string;
  energyGradient: readonly [string, string];
  sageTint: string;
  sageText: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  success: string;
  successSoft: string;
  successText: string;
  overlayBackdrop: string;
}

/**
 * Extracted from Figma reference (figmaprocrastistop/src/index.css)
 * Unified Immersive Theme (default dark emerald glass) & Base Forest Paper Light Theme.
 */
export const DarkPalette: ThemePalette = {
  mode: 'dark',
  backgroundGradient: ['#071b18', '#0a3127', '#0d6242'],
  surfaceGradient: ['#0a1b19', '#10251f', '#0d3a2b'],
  activeFocusGradient: ['#071b18', '#0b3d2d', '#0b6241'],
  checkpointBackground: '#18201c',
  backgroundSolid: '#091f1a',
  surfaceGlass: 'rgba(255, 255, 255, 0.08)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.14)',
  surfaceCardGradient: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)'],
  surfaceElevated: '#102922',
  surfaceMuted: 'rgba(255, 255, 255, 0.06)',
  navBarBg: 'rgba(25, 46, 38, 0.94)',
  navBarBorder: 'rgba(255, 255, 255, 0.22)',
  stickyBarBg: 'rgba(9, 29, 23, 0.94)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  text: '#f7faf7',
  textSecondary: 'rgba(255, 255, 255, 0.74)',
  textMuted: 'rgba(255, 255, 255, 0.52)',
  placeholder: 'rgba(255, 255, 255, 0.34)',
  primary: '#2eac73',
  primaryDark: '#207954',
  primaryGradient: ['#2eac73', '#207954'],
  primaryText: '#ffffff',
  accentMint: '#55dda0',
  accentMintSoft: 'rgba(85, 221, 160, 0.14)',
  energyOrange: '#ff7a1a',
  energyYellow: '#ffc83d',
  energyGradient: ['#ffc83d', '#ff7a1a'],
  sageTint: 'rgba(74, 201, 132, 0.14)',
  sageText: '#8be1b3',
  danger: '#c95050',
  dangerSoft: 'rgba(224, 77, 61, 0.18)',
  dangerText: '#ff9d8d',
  warning: '#c78932',
  warningSoft: 'rgba(255, 180, 60, 0.16)',
  warningText: '#ffc65b',
  success: '#438766',
  successSoft: 'rgba(83, 197, 134, 0.16)',
  successText: '#7de0aa',
  overlayBackdrop: 'rgba(7, 16, 12, 0.78)',
};

export const LightPalette: ThemePalette = {
  mode: 'light',
  backgroundGradient: ['#f7f8f5', '#f3f6f1', '#edf3ed'],
  surfaceGradient: ['#f7f8f5', '#f5f7f3', '#edf3ed'],
  activeFocusGradient: ['#071b18', '#0b3d2d', '#0b6241'],
  checkpointBackground: '#18201c',
  backgroundSolid: '#f7f8f5',
  surfaceGlass: '#ffffff',
  surfaceGlassStrong: '#dce8dd',
  surfaceCardGradient: ['#ffffff', '#f9fbf8'],
  surfaceElevated: '#ffffff',
  surfaceMuted: '#ecefea',
  navBarBg: 'rgba(255, 255, 255, 0.96)',
  navBarBorder: '#e2e7e1',
  stickyBarBg: 'rgba(247, 248, 245, 0.96)',
  border: '#e2e7e1',
  borderSubtle: '#ecefea',
  text: '#202522',
  textSecondary: '#46504a',
  textMuted: '#747c76',
  placeholder: '#9ca39d',
  primary: '#315b46',
  primaryDark: '#244536',
  primaryGradient: ['#315b46', '#244536'],
  primaryText: '#ffffff',
  accentMint: '#315b46',
  accentMintSoft: '#dce8dd',
  energyOrange: '#ff7a1a',
  energyYellow: '#ffc83d',
  energyGradient: ['#ffc83d', '#ff7a1a'],
  sageTint: '#edf3ed',
  sageText: '#315b46',
  danger: '#c95050',
  dangerSoft: '#f9e7e5',
  dangerText: '#a13f3f',
  warning: '#c78932',
  warningSoft: '#f8efdf',
  warningText: '#77511d',
  success: '#438766',
  successSoft: '#edf3ed',
  successText: '#2c684b',
  overlayBackdrop: 'rgba(15, 24, 19, 0.62)',
};

export function getThemePalette(
  preference: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): ThemePalette {
  const resolved: ResolvedTheme =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;
  return resolved === 'light' ? LightPalette : DarkPalette;
}

export const FontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  fallback: Platform.select({
    android: 'sans-serif',
    ios: 'System',
    default: 'System',
  }),
} as const;

export const Typography = {
  heroTimer: {
    fontFamily: FontFamilies.bold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -2,
  },
  homeTimer: {
    fontFamily: FontFamilies.bold,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.8,
  },
  completionNumber: {
    fontFamily: FontFamilies.extraBold,
    fontSize: 54,
    lineHeight: 58,
    letterSpacing: -2.5,
  },
  h1: {
    fontFamily: FontFamilies.bold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.7,
  },
  h2: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  h3: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 21,
  },
  bodySemiBold: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  small: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  eyebrow: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  xs: 8,
  sm: 10,
  md: 13,
  lg: 18,
  xl: 22,
  xxl: 26,
  full: 999,
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#04120c',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: '#04120c',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
  }),
  energyButton: Platform.select({
    ios: {
      shadowColor: '#ff6f10',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
    },
    android: {
      elevation: 6,
    },
    default: {
      shadowColor: '#ff6f10',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
    },
  }),
  floatingNav: Platform.select({
    ios: {
      shadowColor: '#04100b',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.25,
      shadowRadius: 28,
    },
    android: {
      elevation: 10,
    },
    default: {
      shadowColor: '#04100b',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.25,
      shadowRadius: 28,
    },
  }),
};

export const Layout = {
  maxContentWidth: 520,
  floatingNavHeight: 68,
  floatingNavBottomOffset: 14,
} as const;
