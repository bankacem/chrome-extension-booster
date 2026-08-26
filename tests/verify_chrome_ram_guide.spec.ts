import { test, expect } from '@playwright/test';

test('verify chrome-ram-guide rendering', async ({ page }) => {
  await page.goto('/blog/chrome-ram-guide');

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
  await page.goto('/ar/blog/chrome-extension-permissions-guide');
  await page.waitForSelector('h1', { timeout: 10000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1').first()).toContainText('الدليل الشامل لصلاحيات إضافات كروم');
  await expect(page.locator('body')).toContainText('كل إضافة كروم تثبّتها تحصل على مجموعة من الصلاحيات');
});

test('verify Portuguese localized article rendering after hydration', async ({ page }) => {
  await page.goto('/pt/blog/chrome-extension-security-risks-permission-audit-guide');
  await page.waitForSelector('h1', { timeout: 10000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('h1').first()).toContainText('Riscos de Segurança de Extensões do Chrome');
  await expect(page.locator('body')).toContainText('As extensões do Chrome são fáceis de subestimar');
});

test('verify Arabic and Portuguese UI localization after hydration', async ({ page }) => {
  const locales = [
    { path: '/ar', lang: 'ar', dir: 'rtl', cta: 'تصفح الإضافات', blog: '/ar/blog' },
    { path: '/pt', lang: 'pt', dir: 'ltr', cta: 'Ver extensões', blog: '/pt/blog' },
  ] as const;

  for (const locale of locales) {
    await page.goto(locale.path);
    await expect(page.locator('html')).toHaveAttribute('lang', locale.lang);
    await expect(page.locator('html')).toHaveAttribute('dir', locale.dir);
    await expect(page.locator('body')).toContainText(locale.cta);
    await expect(page.locator(`a[href="${locale.blog}"]`).first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Supercharge Your');
  }
});
