import { defineConfig } from '@playwright/test';
const python = process.platform === 'win32' ? '..\\.venv\\Scripts\\python.exe' : '../.venv/bin/python';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5180', headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
  webServer: [
    { command: `${python} -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8010`, url: 'http://127.0.0.1:8010/health', reuseExistingServer: false },
    { command: 'npm run dev -- --port 5180', url: 'http://127.0.0.1:5180', reuseExistingServer: false,
      env: { SAGE_DEV_BACKEND: 'ws://127.0.0.1:8010', SAGE_DEV_API: 'http://127.0.0.1:8010' } },
  ],
});
