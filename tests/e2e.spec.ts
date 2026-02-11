
import { test, expect } from '@playwright/test';

test.describe('PRD Master E2E', () => {
    test('should load home page', async ({ page }) => {
        await page.goto('http://localhost:3003');
        await expect(page).toHaveTitle(/PRD Master/);
        await expect(page.getByText('PRD Master Architecture')).toBeVisible();
    });

    test('should open auth modal on start', async ({ page }) => {
        await page.goto('http://localhost:3003');
        // Mobile sidebar might hide this, so ensure viewport is large or handle sidebar
        await page.setViewportSize({ width: 1280, height: 720 });

        await page.getByRole('button', { name: '登入後開始' }).click();
        await expect(page.getByText('PRD Master Architecture')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });

    test('should handle validation errors', async ({ page }) => {
        await page.goto('http://localhost:3003');
        await page.setViewportSize({ width: 1280, height: 720 });

        await page.getByRole('button', { name: '登入後開始' }).click();

        // Switch to register
        await page.getByRole('button', { name: 'Register' }).first().click(); // The toggle button/text

        await page.fill('input[type="email"]', 'test@yopmail.com'); // Disposable email
        await page.getByRole('button', { name: 'Register' }).last().click(); // Submit button

        // Expect alert or processing. Since we use window.alert, we need to handle it.
        page.on('dialog', dialog => {
            expect(dialog.message()).toContain('Temporary email addresses are not allowed');
            dialog.dismiss();
        });
    });
});
