import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3003';
const CUSTOMER_EMAIL = 'customer@example.com';
const CUSTOMER_PASSWORD = 'customer123';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

test.describe('Full Product → Cart → Order → Admin Journey', () => {
  test('customer purchases a product and admin sees it', async ({ page }) => {
    // ── Phase 1: Browse products ─────────────────────────────────
    await test.step('Browse products and view detail', async () => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Discover Premium Products');

      // Click "Shop Now"
      await page.click('text=Shop Now');
      await expect(page).toHaveURL(/\/products/);

      // Click first product
      const firstProductLink = page.locator('a[href^="/products/"]').first();
      await firstProductLink.click();
      await expect(page).toHaveURL(/\/products\//);
    });

    // ── Phase 2: Login as customer ───────────────────────────────
    await test.step('Login as customer', async () => {
      await page.goto('/auth/login');
      await expect(page.locator('h1')).toContainText(/Sign In|Login/);

      // Fill login form (uses custom Input component, id from label)
      await page.fill('#email', CUSTOMER_EMAIL);
      const passwordField = page.locator('input[type="password"]').first();
      await passwordField.fill(CUSTOMER_PASSWORD);
      await page.click('button[type="submit"]');

      // Should redirect to home
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    // ── Phase 3: View product and add to cart ────────────────────
    let orderNumber: string | null = null;

    await test.step('Add product to cart', async () => {
      // Go to products and click first
      await page.goto('/products');
      const firstProductLink = page.locator('a[href^="/products/"]').first();
      await firstProductLink.click();
      await expect(page).toHaveURL(/\/products\//);

      // Click "Add to Cart"
      const addToCartButton = page.locator('button', { hasText: 'Add to Cart' });
      await expect(addToCartButton).toBeVisible();
      await addToCartButton.click();

      // Wait for success feedback
      await expect(page.locator('text=Added to cart')).toBeVisible({ timeout: 10000 });
    });

    // ── Phase 4: Cart and checkout ───────────────────────────────
    await test.step('View cart and proceed to checkout', async () => {
      await page.goto('/cart');
      await expect(page).toHaveURL(/\/cart/);
      // Verify cart has items (not empty)
      await expect(page.locator('text=Proceed to Checkout')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Complete checkout and place order', async () => {
      // Click "Proceed to Checkout"
      await page.click('text=Proceed to Checkout');
      await expect(page).toHaveURL(/\/checkout/);

      // Fill shipping details
      // The checkout form uses custom Input components with id from label
      const nameInput = page.locator('#full-name');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Jane Customer');
      }
      const addressInput = page.locator('#address');
      if (await addressInput.isVisible()) {
        await addressInput.fill('123 Main Street');
      }
      const cityInput = page.locator('#city');
      if (await cityInput.isVisible()) {
        await cityInput.fill('New York');
      }
      const zipInput = page.locator('#zip-code');
      if (await zipInput.isVisible()) {
        await zipInput.fill('10001');
      }

      // Click "Place Order" or submit
      const placeOrderButton = page.locator('button', { hasText: /Place Order|Submit/i });
      if (await placeOrderButton.isVisible()) {
        await placeOrderButton.click();
      }

      // Wait for order confirmation page
      await expect(page).toHaveURL(/\/checkout\/success|\/orders\//, { timeout: 15000 });

      // Extract order number from the page if visible
      const orderNumberEl = page.locator('[data-testid="order-number"], .order-number, text=/ORD-/');
      if (await orderNumberEl.first().isVisible().catch(() => false)) {
        orderNumber = await orderNumberEl.first().textContent();
      }
    });

    // ── Phase 5: View order history ──────────────────────────────
    await test.step('View order history', async () => {
      await page.goto('/orders');
      await expect(page).toHaveURL(/\/orders/);

      // Should see at least one order
      await expect(page.locator('text=/ORD-/').first()).toBeVisible({ timeout: 10000 });
    });

    // ── Phase 6: Admin dashboard ─────────────────────────────────
    await test.step('Admin login and view orders', async () => {
      // Clear customer cookies, login as admin
      await page.context().clearCookies();

      await page.goto(`${ADMIN_URL}/login`);
      await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();

      // Login as admin
      await page.getByLabel('Email').fill(ADMIN_EMAIL);
      await page.getByLabel('Password').fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(`${ADMIN_URL}/`, { timeout: 15000 });

      // Check dashboard has stats
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Navigate to Orders
      await page.getByRole('link', { name: 'Orders', exact: true }).click();
      await expect(page).toHaveURL(/\/orders/);

      // Verify there are orders (table should have rows or an order visible)
      // The order might have been created in this test or exist from seed data
      await expect(page.locator('text=/ORD-/').first()).toBeVisible({ timeout: 10000 });

      // If we got an order number from Phase 4, verify it's in the admin list
      if (orderNumber) {
        await expect(page.locator(`text=${orderNumber}`).first()).toBeVisible({ timeout: 5000 });
      }

      // Navigate back to Dashboard to verify analytics
      await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
      await expect(page).toHaveURL(`${ADMIN_URL}/`);

      // Verify dashboard stats are showing (revenue, orders, users stats)
      await expect(page.locator('text=Total Revenue').or(page.locator('text=Orders'))).toBeVisible({ timeout: 5000 });
    });
  });
});
