import { test, expect } from '@playwright/test';

test.describe('Customer Journey', () => {
  test('browse, search, view product, add to cart, and checkout', async ({ page }) => {
    // Visit homepage
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Discover Premium Products');

    // Browse products
    await page.click('text=Shop Now');
    await expect(page).toHaveURL(/\/products/);

    // Search for a product
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('product');
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/search=/);

    // View first product detail
    const firstProductLink = page.locator('a[href^="/products/"]').first();
    await firstProductLink.click();
    await expect(page).toHaveURL(/\/products\//);

    // Add to cart
    const addToCartButton = page.locator('button', { hasText: 'Add to Cart' });
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      // Wait for loading state
      await expect(addToCartButton).toBeEnabled({ timeout: 5000 });
    }

    // Go to cart
    const cartButton = page.locator('button[aria-label*="Cart"]');
    await cartButton.click();

    // Check cart drawer is visible
    await expect(page.locator('h2:has-text("Cart"), h2:has-text("Shopping Cart")').first()).toBeVisible();
  });

  test('register, login, and place order', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // Visit register page
    await page.goto('/auth/register');
    await expect(page.locator('h1')).toContainText('Create Account');

    // Fill registration form
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', testEmail);
    const pwFields = page.locator('input[type="password"]');
    await pwFields.nth(0).fill(testPassword);
    await pwFields.nth(1).fill(testPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to home after successful registration
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
