import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 15_000,
    setupFiles: ['./tests/helpers/env.ts'],
    globalSetup: ['./tests/helpers/global-setup.ts'],
    // All tests share one test DB; run files sequentially to avoid TRUNCATE deadlocks.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/db/migrate.ts',
        'src/db/seed.ts',
        'src/db/reset.ts',
      ],
      // Thresholds lock in current baseline (run `npm run test:coverage` to regenerate).
      // Bump these as the test suite grows.
      thresholds: {
        statements: 48,
        branches: 34,
        functions: 50,
        lines: 53,
      },
    },
  },
});
