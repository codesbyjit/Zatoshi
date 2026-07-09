import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = `e2e-${Date.now()}@test.com`;
  const testPassword = 'StrongPass1!';
  const testName = 'E2E User';

  test('register new user', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('h1')).toContainText('Create Account');

    // Fill form
    await page.fill('#full-name', testName);
    await page.fill('#email', testEmail);
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(testPassword);
    await passwordFields.nth(1).fill(testPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // User name should appear in header
    await expect(page.locator('header')).toContainText(testName, { timeout: 5000 });
  });

  test('login with existing credentials', async ({ page }) => {
    // First register a user
    const email = `login-${Date.now()}@test.com`;
    await page.goto('/auth/register');
    await page.fill('#full-name', 'Login Test');
    await page.fill('#email', email);
    const pwFields = page.locator('input[type="password"]');
    await pwFields.nth(0).fill(testPassword);
    await pwFields.nth(1).fill(testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Logout by reloading (tokens not persisted in this test)
    // Go to login page
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toContainText('Sign In');

    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', testPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // User should be authenticated
    await expect(page.locator('header')).toContainText('Login Test', { timeout: 5000 });
  });
});
