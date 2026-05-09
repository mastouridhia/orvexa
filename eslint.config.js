// Shared flat ESLint base for the Orvexa monorepo.
// Per-package eslint.config.js files import `base` and add environment-specific layers.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export const ignores = globalIgnores([
  '**/dist/**',
  '**/build/**',
  '**/node_modules/**',
  '**/coverage/**',
  '**/.vite/**',
]);

export const base = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export const node = [
  {
    files: ['**/*.{ts,js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
];

export const browser = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
];

export default [...base, ...node];
