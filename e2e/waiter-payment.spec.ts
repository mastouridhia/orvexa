import { test, expect } from '@playwright/test';

const WAITER_URL = 'http://localhost:5175';

test.describe('Waiter payment flow', () => {
  test('waiter login renders the dashboard', async ({ page }) => {
    await page.goto(WAITER_URL);

    const email = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first();
    const password = page
      .getByLabel(/password|mot de passe/i)
      .or(page.getByPlaceholder(/password|mot de passe/i))
      .first();
    await email.fill('waiter@demo.tn');
    await password.fill('orvexa');

    const submit = page.getByRole('button', { name: /sign in|log in|connexion|se connecter/i });
    await submit.first().click();

    // After login, expect the table grid or "Tables" header
    await expect(
      page
        .getByRole('heading', { name: /tables/i })
        .or(page.getByText(/Table 1/i))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
