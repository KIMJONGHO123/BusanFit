import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL: process.env.BUSANFIT_WEB_BASE_URL || 'http://127.0.0.1:5173', channel: 'chrome' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    // Isolated normal tests use a dummy browser key and a test-only SDK double.
    // Explicit live runs use the existing local public map configuration.
    env: process.env.BUSANFIT_LIVE_MAP === '1' || process.env.BUSANFIT_LIVE_WEB_DIAGNOSIS === '1' ? {} : { VITE_TMAP_MAP_APP_KEY: 'synthetic-test-map-key' },
    url: process.env.BUSANFIT_WEB_BASE_URL || 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
