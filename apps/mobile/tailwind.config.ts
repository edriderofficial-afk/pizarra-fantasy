import type { Config } from 'tailwindcss';
import preset from '@pizarra/ui/tailwind-preset';

export default {
  // NativeWind preset must come first so our tokens extend it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require('nativewind/preset'), preset],
  content: ['./src/**/*.{ts,tsx}'],
} satisfies Config;
