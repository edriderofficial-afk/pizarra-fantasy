// Shared flat ESLint config for every workspace package.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @param {{ react?: boolean }} [opts] */
export function config(opts = {}) {
  return tseslint.config(
    {
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/.expo/**',
        '**/coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,cjs,mjs}',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.strict,
    {
      languageOptions: { globals: { ...globals.node } },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
    ...(opts.react
      ? [
          {
            plugins: { 'react-hooks': reactHooks },
            rules: reactHooks.configs.recommended.rules,
          },
        ]
      : []),
    prettier,
  );
}

export default config();
