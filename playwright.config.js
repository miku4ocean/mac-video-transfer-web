// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || 4173;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // 真正的 http:// 環境（非 file://），供 FFmpeg WASM 全流程驗證用
  webServer: {
    command: `node scripts/serve.js ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
