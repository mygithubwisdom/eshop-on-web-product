import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { tmpdir } from 'node:os';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  use: { baseURL: 'http://localhost:3102', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --port 3102',
    url: 'http://localhost:3102/api/shop',
    timeout: 120000,
    reuseExistingServer: false,
    env: { DEMO_MODE:'true', APP_URL:'http://localhost:3102', DEMO_DB_PATH:path.join(tmpdir(),`naija-browser-${process.pid}.sqlite`), NEXT_TELEMETRY_DISABLED:'1' },
  },
});
