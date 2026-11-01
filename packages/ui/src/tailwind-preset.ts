import type { Config } from 'tailwindcss';
import { difficulty, fontSize, palette, radius, spacing, themes } from './tokens';

const px = (n: number) => `${n}px`;
const mapPx = <K extends string | number>(o: Readonly<Record<K, number>>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, px(v as number)]));

/** Shared Tailwind 3.4 preset for NativeWind (mobile) and Next (web). */
const preset = {
  content: [],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: palette.ink,
        chalk: palette.chalk,
        pitch: palette.pitch,
        accent: palette.accent,
        warning: palette.warning,
        danger: palette.danger,
        success: palette.success,
        dark: { ...themes.dark },
        light: { ...themes.light },
        difficulty: Object.fromEntries(
          Object.entries(difficulty).map(([k, v]) => [k, { DEFAULT: v.bg, fg: v.fg }]),
        ),
      },
      spacing: mapPx(spacing),
      borderRadius: mapPx(radius),
      fontSize: mapPx(fontSize),
    },
  },
} satisfies Config;

export default preset;
