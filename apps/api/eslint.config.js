import { base, node } from '../../eslint.config.js';

export default [
  ...base,
  ...node,
  {
    files: ['src/db/migrate.ts', 'src/db/seed.ts', 'src/db/reset.ts', 'scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
