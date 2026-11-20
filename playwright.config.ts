import { defineConfig, devices } from '@playwright/test'

const externalUrl = process.env.PLAYWRIGHT_BASE_URL
const localUrl = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: externalUrl || localUrl,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined,
  },
  webServer: externalUrl ? undefined : {
    command: 'pnpm exec wrangler pages dev dist --ip 127.0.0.1 --port 4174',
    url: localUrl,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: devices['Desktop Chrome'] },
    { name: 'mobile', use: devices['Pixel 7'] },
  ],
})
