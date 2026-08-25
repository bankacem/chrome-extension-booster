import { test, expect } from '@playwright/test';

test('verify chrome-ram-guide rendering', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/blog/chrome-ram-guide');

  // Wait for the content to load
  await page.waitForSelector('h1', { timeout: 10000 });

  // Check for the title
  const title = await page.locator('h1').first().textContent();
  expect(title).toContain('The Ultimate Chrome RAM Usage Guide');

  // Check for the Comparison Table
  const table = await page.locator('table').first().first();
  await expect(table).toBeVisible();

  // Check for Pro-Tip box specifically
  const proTip = await page.locator('h2:has-text("Best RAM Optimization Setup")').first();
  await expect(proTip).toBeVisible();

  // Check for FAQ
  const faq = await page.locator('h2:has-text("FAQ")');
  await expect(faq).toBeVisible();

  // Take a screenshot
  await page.screenshot({ path: 'verification/screenshots/chrome_ram_guide_final.png', fullPage: true });
});
