// SPDX-License-Identifier: MIT
// 端到端测试：npm run test:e2e（需先 npx playwright install chromium webkit）
const { defineConfig, devices } = require('@playwright/test');

const PORT = 8766;
module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  // Service Worker 首次安装后会刷新页面，测试里禁用，避免中途导航
  use: { baseURL: `http://127.0.0.1:${PORT}/`, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } }
  ],
  webServer: {
    command: `node scripts/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI
  }
});
