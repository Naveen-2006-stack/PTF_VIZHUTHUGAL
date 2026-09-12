import { expect, test, loginAs } from './fixtures/auth';

test.describe('responsive portal usability', () => {
  test('login and authenticated dashboard fit the viewport without horizontal overflow', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Institutional Portal Login' })).toBeVisible();
    const loginScroll = await page.evaluate(() => document.documentElement.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(loginScroll).toBeLessThanOrEqual(windowWidth + 2);

    await loginAs(page, 'SUPER_ADMIN');
    await expect(page.locator('main')).toBeVisible();
    const dashScroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(dashScroll).toBeLessThanOrEqual(windowWidth + 2);
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('student mobile navigation and academic forms fit without broken layout', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/academics/ct-marks');
    await expect(page.locator('main')).toBeVisible();
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const winW = await page.evaluate(() => window.innerWidth);
    expect(scrollW).toBeLessThanOrEqual(winW + 2);

    await page.goto('/leave-permission');
    await expect(page.locator('main')).toBeVisible();
    const leaveScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(leaveScrollW).toBeLessThanOrEqual(winW + 2);
  });
});
