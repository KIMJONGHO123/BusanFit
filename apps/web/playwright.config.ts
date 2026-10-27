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
    url: process.env.BUSANFIT_WEB_BASE_URL || 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
