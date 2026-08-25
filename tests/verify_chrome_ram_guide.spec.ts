import { test, expect } from '@playwright/test';

test('verify chrome-ram-guide rendering', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/blog/chrome-ram-guide');

  // Wait for the content to load
  await page.waitForSelector('h1', { timeout: 10000 });

  // Check for the current published title
  const title = await page.locator('h1').first().textContent();
  expect(title).toContain('Chrome Using Too Much RAM? How to Diagnose and Reduce Memory');

  // Check for the Comparison Table
  const table = await page.locator('table').first().first();
  await expect(table).toBeVisible();

  // Check for the Frequently Asked Questions section
  const faq = await page.locator('h2:has-text("Frequently asked questions")').first();
  await expect(faq).toBeVisible();

  // Keep the screenshot in CI output rather than a tracked verification asset.
  await page.screenshot({ path: 'test-results/chrome_ram_guide_final.png', fullPage: true });
});

test('verify Arabic localized article rendering after hydration', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/ar/blog/chrome-extension-permissions-guide');
  await page.waitForSelector('h1', { timeout: 10000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1').first()).toContainText('الدليل الشامل لصلاحيات إضافات كروم');
  await expect(page.locator('body')).toContainText('كل إضافة كروم تثبّتها تحصل على مجموعة من الصلاحيات');
});
