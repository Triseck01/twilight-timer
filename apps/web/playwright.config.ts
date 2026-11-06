import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end-Tests im WebKit (Safari-Engine), iPad im Querformat.
 * Testet den Produktions-Build (vorher `npm run build`), ausgeliefert von e2e/static-server.mjs.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4310/twilight-timer/',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'ipad-webkit', use: { ...devices['iPad Pro 11 landscape'] } }],
  webServer: {
    command: 'node e2e/static-server.mjs',
    url: 'http://127.0.0.1:4310/twilight-timer/',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
