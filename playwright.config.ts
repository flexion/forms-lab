import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: '**/*{contract,conformance}*.test.ts',
  fullyParallel: true,
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'bun run dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
