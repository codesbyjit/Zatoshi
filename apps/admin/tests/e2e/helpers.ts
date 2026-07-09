import type { Page } from '@playwright/test';

/**
 * Attempt to login as admin. Retries if rate-limited.
 * Returns true if login succeeded (URL changed to /).
 */
export async function loginAsAdmin(page: Page, email = 'admin@example.com', password = 'admin123'): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if already on dashboard (already authenticated)
    const currentUrl = page.url();
    if (currentUrl === 'http://localhost:3003/' || currentUrl === '/') {
      // Check if the dashboard heading is visible
      const dashboardVisible = await page.getByRole('heading', { name: 'Dashboard' }).isVisible().catch(() => false);
      if (dashboardVisible) return;
    }

    // Navigate to login page if not already there
    if (!page.url().includes('/login')) {
      await page.goto('/login');
    }

    // Check if already redirected to dashboard (authenticated from previous login)
    if (page.url().includes('/login') === false) {
      return;
    }

    // Fill and submit login form
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation to dashboard (allow up to 15s for the login API + redirect)
    try {
      await page.waitForURL('/', { timeout: 15000 });
      return; // Login successful
    } catch {
      // Check if rate limited
      const pageContent = (await page.textContent('body').catch(() => '')) ?? '';
      const rateLimited = pageContent.toLowerCase().includes('too many requests');
      if (rateLimited && attempt < maxAttempts) {
        // Wait for rate limit to reset
        await page.waitForTimeout(2000);
        await page.goto('/login');
        continue;
      }
      // Check for visible error message
      const errorVisible = await page.locator('.bg-\\[\\#fef2f2\\]').first().isVisible().catch(() => false);
      const errorText = errorVisible ? (await page.locator('.bg-\\[\\#fef2f2\\]').first().textContent().catch(() => '')) : '';
      // Some other error — let the caller handle it
      throw new Error(
        `Login failed after attempt ${attempt}. Current URL: ${page.url()}. Error on page: "${errorText}"`,
      );
    }
  }

  throw new Error('Login failed after max retries (rate limited)');
}

/**
 * Navigate to a URL, handling auth redirects.
 */
export async function gotoAndWait(page: Page, url: string, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 15000;
  await page.goto(url);
  await page.waitForURL(url, { timeout });
}
