import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env['CI'] === 'true' ? 'github' : 'list',
  // Launch the app once before the suite so a build that crashes on load fails
  // in under a minute, rather than once per test.
  globalSetup: './e2e/global-setup.ts',
  // The suite launches the real app, which downloads the Widevine component and
  // loads the live site. Retrying once absorbs a slow first run without hiding
  // a real regression.
  retries: process.env['CI'] === 'true' ? 1 : 0
})
