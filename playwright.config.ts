import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './.pw-verify',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3003',
  },
});
