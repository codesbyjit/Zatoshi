import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for any error message (rate limit, invalid credentials, etc.)
    await expect(
      page.locator('.bg-\\[\\#fef2f2\\]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify we're on the dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should show admin sidebar after login', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify sidebar navigation items (use exact match to avoid conflicts with dashboard links)
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Orders', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Categories', exact: true })).toBeVisible();
  });

  test('should redirect to login when accessing dashboard without auth', async ({ page, context }) => {
    // Clear cookies (auth uses httpOnly cookies, not localStorage)
    await context.clearCookies();
    await page.goto('/');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
  });
});
