import { expect, test, accountFor, loginAs, logout } from './fixtures/auth';

test.describe('authentication and session lifecycle', () => {
  test('logged-out users are redirected from the portal', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login exposes recovery and password-management pages', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot Password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Recover Account Access' })).toBeVisible();

    await page.goto('/change-password');
    await expect(page.getByRole('heading', { name: 'Set Permanent Password' })).toBeVisible();
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: 'Reset Account Password' })).toBeVisible();
  });

  test('invalid password is rejected without entering the portal', async ({ page }) => {
    const account = accountFor('SUPER_ADMIN')!;
    await page.goto('/login');
    await page.getByLabel('Login ID / Email').fill(account.login);
    await page.locator('#login-password').fill(`${account.password}-invalid`);
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('deactivated account is blocked from entering portal', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Login ID / Email').fill('disabled.user@ptffoundation.org');
    await page.locator('#login-password').fill('Disabled@2026');
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();
    await expect(page.locator('#login-error')).toContainText(/deactivated|administrator/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  for (const role of ['SUPER_ADMIN', 'SEMI_ADMIN', 'PTF_SECRETARY', 'STAFF_MENTOR', 'STUDENT'] as const) {
    test(`${role} can authenticate and sign out`, async ({ page }) => {
      await loginAs(page, role);
      await expect(page.locator('main')).toBeVisible();
      await logout(page);
    });
  }
});
