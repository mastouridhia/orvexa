import { test, expect } from '@playwright/test';
import { getTableQrToken, listTables, loginStaff } from './helpers/api.js';

test.describe('Customer order flow', () => {
  test('scan QR → land on menu → see categories', async ({ page }) => {
    const admin = await loginStaff('admin@demo.tn');
    const tables = await listTables(admin.accessToken);
    const tableId = tables[0]?.id;
    expect(tableId).toBeDefined();

    const qr = await getTableQrToken(admin.accessToken, tableId!);
    await page.goto(`/t/${qr}`);

    // SessionBoot redirects to /menu after opening the session.
    await page.waitForURL(/\/menu$/, { timeout: 10_000 });

    // Menu page renders category section headings from the seeded data.
    await expect(page.getByRole('heading', { name: /^Plats|Mains$/ }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('language switcher flips aria-pressed', async ({ page }) => {
    const admin = await loginStaff('admin@demo.tn');
    const tables = await listTables(admin.accessToken);
    const qr = await getTableQrToken(admin.accessToken, tables[0]!.id);
    await page.goto(`/t/${qr}`);
    await page.waitForURL(/\/menu$/);

    const langGroup = page.getByRole('group', { name: /language/i }).first();
    const en = langGroup
      .getByRole('button')
      .filter({ hasText: /^English|EN$/i })
      .first();
    await en.click();
    await expect(en).toHaveAttribute('aria-pressed', 'true');
    // After switching to English, the section heading should read "Mains"
    await expect(page.getByRole('heading', { name: /^Mains$/ }).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
