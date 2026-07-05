import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './.pw-verify',
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:3003',
  },
});
