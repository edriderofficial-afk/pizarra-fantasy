import nextPlugin from '@next/eslint-plugin-next';
import { config } from '@pizarra/config/eslint';

export default [
  ...config({ react: true }),
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
