import { test, expect } from '@playwright/test';

const KITCHEN_URL = 'http://localhost:5174';

test.describe('Kitchen status flow', () => {
  test('kitchen login renders the board', async ({ page }) => {
    await page.goto(KITCHEN_URL);

    // Login screen shows email + password fields
    const email = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first();
    const password = page
      .getByLabel(/password|mot de passe/i)
      .or(page.getByPlaceholder(/password|mot de passe/i))
      .first();
    await email.fill('kitchen@demo.tn');
    await password.fill('orvexa');

    const submit = page.getByRole('button', { name: /sign in|log in|connexion|se connecter/i });
    await submit.first().click();

    // After login, the board's column headers should appear.
    await expect(
      page.getByRole('heading', { name: /^Received|Reçues|في الانتظار$/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /^Ready|Prêtes|جاهزة$/i }).first(),
    ).toBeVisible();
  });
});
