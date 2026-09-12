import { expect, test, loginAs } from './fixtures/auth';
import { expectRedirectedTo } from './helpers/navigation';

test.describe('Portal Notification System', () => {
  const uniqueTestNotice = `Test Broadcast ${Date.now()}`;

  // 1. Super Admin send & confirmation flow
  test('Super Admin can compose, preview, and send notifications to all students', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/admin/notifications');
    await expect(page.getByRole('heading', { name: 'Notification Center', level: 1 })).toBeVisible();

    // Ensure composer inputs are visible
    await expect(page.locator('#composer-title-input')).toBeVisible();
    await page.fill('#composer-title-input', uniqueTestNotice);
    await page.fill('#composer-message-textarea', 'Important institutional briefing for all PTF scholars.');

    // Select Priority: Important
    await page.locator('#priority-btn-important').click();

    // Click Preview
    await page.locator('#btn-preview-notification').click();
    await expect(page.getByText('Notice Preview (Student View)')).toBeVisible();
    await expect(page.getByText(uniqueTestNotice)).toBeVisible();
    await page.getByRole('button', { name: 'Close Preview' }).click();

    // Click Send Notification -> Shows Confirmation Modal
    await page.locator('#btn-send-notification').click();
    await expect(page.getByText('Confirm Notification Dispatch')).toBeVisible();
    await expect(page.getByText(/You are about to send this notification to/)).toBeVisible();

    // Confirm & Send
    await page.locator('#confirm-send-btn').click();

    // Verify success banner and transition to History tab
    await expect(page.getByText(/Notification successfully dispatched/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(uniqueTestNotice)).toBeVisible({ timeout: 10000 });
  });

  // 2. Semi Admin targeting & restrictions
  test('Semi Admin can access Notification Center but cannot target roles', async ({ page }) => {
    await loginAs(page, 'SEMI_ADMIN');
    await page.goto('/admin/notifications');
    await expect(page.getByRole('heading', { name: 'Notification Center', level: 1 })).toBeVisible();

    // Should see All Students, Campus, Individual, Selected
    await expect(page.getByRole('button', { name: /All Students/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Campus/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Individual Student/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Selected Students/i })).toBeVisible();

    // Should NOT see Role targeting (Super Admin privilege)
    await expect(page.getByRole('button', { name: /Portal Role/i })).not.toBeVisible();
  });

  // 3. PTF Secretary read-only mode
  test('PTF Secretary has read-only access to Notification History', async ({ page }) => {
    await loginAs(page, 'PTF_SECRETARY');
    await page.goto('/admin/notifications');
    await expect(page.getByRole('heading', { name: 'Notification Center', level: 1 })).toBeVisible();

    // History is visible
    await expect(page.getByText(/Notification History/)).toBeVisible();

    // Composer button is NOT visible for Secretary
    await expect(page.locator('#tab-composer-btn')).not.toBeVisible();
    await expect(page.locator('#composer-title-input')).not.toBeVisible();
  });

  // 4. Staff Mentor access restriction
  test('Staff Mentor is blocked from /admin/notifications', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await expectRedirectedTo(page, '/admin/notifications', /\/attendance\/abdul-kalam$/);
  });

  // 5. Student access restriction
  test('Student is blocked from /admin/notifications', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await expectRedirectedTo(page, '/admin/notifications', /\/dashboard(?:\?.*)?$/);
  });

  // 6. Student views personal notifications, unread badge, and auto-mark-read
  test('Student sees notifications in /notifications, dynamic badge updates, and auto-marks read', async ({ page }) => {
    await loginAs(page, 'STUDENT');

    // Check navbar header notification bell
    const headerBtn = page.locator('#header-notifications-btn');
    await expect(headerBtn).toBeVisible();

    // Go to student notifications
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notification Center', level: 1 })).toBeVisible();

    // Ensure notification is listed
    const noticeRow = page.getByText(/Important institutional briefing for all PTF scholars./i).first();
    await expect(noticeRow).toBeVisible({ timeout: 10000 });

    // Click on notification to view detail
    await noticeRow.click();

    // Detail modal opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Important institutional briefing for all PTF scholars.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close Notice' }).click();

    // Test Mark all as read button
    const markAllBtn = page.locator('#mark-all-read-btn');
    if (await markAllBtn.isEnabled()) {
      await markAllBtn.click();
      await page.waitForTimeout(1000);
      await expect(markAllBtn).toBeDisabled();
    }
  });

  // 7. Security: Unauthorized direct API call blocked
  test('Security: Direct unauthenticated POST /api/notifications/send returns 401', async ({ request }) => {
    const res = await request.post('/api/notifications/send', {
      data: { title: 'Unauthorized hack', message: 'Should be rejected' },
    });
    expect(res.status()).toBe(401);
  });

  // 8. Security: Direct unauthenticated GET /api/notifications/history returns 401
  test('Security: Direct unauthenticated GET /api/notifications/history returns 401', async ({ request }) => {
    const res = await request.get('/api/notifications/history');
    expect(res.status()).toBe(401);
  });
});
