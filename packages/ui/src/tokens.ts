/**
 * Design tokens: single source of truth for mobile (NativeWind) and web (Tailwind).
 * Own brand palette: deliberately NOT the reference app's colors.
 * Every foreground/background pair used for text must meet WCAG AA (4.5:1);
 * see tokens.test.ts.
 */

export const palette = {
  ink: {
    950: '#0a0e1a',
    900: '#111727',
    800: '#1a2236',
    700: '#273049',
    500: '#5b6685',
    300: '#a9b2c9',
    100: '#e6e9f2',
    50: '#f6f7fb',
  },
  chalk: '#f8fafc',
  pitch: {
    500: '#22a565',
    400: '#3cc47f',
  },
  accent: {
    500: '#4f7dff',
    400: '#7d9fff',
    600: '#2f5ae0',
  },
  warning: '#f2b134',
  danger: '#ef5a5a',
  success: '#3cc47f',
} as const;

export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  readonly text: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly pitch: string;
}

export const themes: { readonly dark: ThemeColors; readonly light: ThemeColors } = {
  dark: {
    background: palette.ink[950],
    surface: palette.ink[900],
    surfaceRaised: palette.ink[800],
    border: palette.ink[700],
    text: palette.chalk,
    textMuted: palette.ink[300],
    primary: palette.accent[400],
    onPrimary: palette.ink[950],
    pitch: palette.pitch[500],
  },
  light: {
    background: palette.ink[50],
    surface: '#ffffff',
    surfaceRaised: palette.ink[100],
    border: '#d3d8e6',
    text: palette.ink[950],
    textMuted: '#4a5370',
    primary: palette.accent[600],
    onPrimary: '#ffffff',
    pitch: palette.pitch[500],
  },
};

/** Match difficulty 1 (easiest) .. 5 (hardest). Never rely on color alone: label + icon too. */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface DifficultyToken {
  readonly bg: string;
  readonly fg: string;
  /** i18n key for the label shown next to the color. */
  readonly labelKey: string;
  /** Icon name (resolved per platform). */
  readonly icon: string;
}

export const difficulty: Readonly<Record<DifficultyLevel, DifficultyToken>> = {
  1: { bg: '#1f9d55', fg: '#06140c', labelKey: 'difficulty.veryEasy', icon: 'chevrons-down' },
  2: { bg: '#7cc85a', fg: '#0d1a07', labelKey: 'difficulty.easy', icon: 'chevron-down' },
  3: { bg: '#e8c547', fg: '#1d1704', labelKey: 'difficulty.medium', icon: 'minus' },
  4: { bg: '#f08a3c', fg: '#1f0e02', labelKey: 'difficulty.hard', icon: 'chevron-up' },
  5: { bg: '#c93a3a', fg: '#ffffff', labelKey: 'difficulty.veryHard', icon: 'chevrons-up' },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;
export const radius = { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 } as const;
export const fontSize = { xs: 12, sm: 14, base: 16, lg: 18, xl: 22, '2xl': 28, '3xl': 34 } as const;
