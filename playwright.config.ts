import { defineConfig, devices } from '@playwright/test';

const PORTS = {
  api: 4000,
  customer: 5173,
  kitchen: 5174,
  waiter: 5175,
  admin: 5176,
};

export default defineConfig({
  testDir: './e2e',
  // Tests share a single test DB; serialize for predictable state.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTS.customer}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      url: `http://localhost:${PORTS.api}/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:customer',
      url: `http://localhost:${PORTS.customer}`,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:kitchen',
      url: `http://localhost:${PORTS.kitchen}`,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:waiter',
      url: `http://localhost:${PORTS.waiter}`,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
