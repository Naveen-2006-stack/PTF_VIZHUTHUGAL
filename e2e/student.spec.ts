import { expect, test, loginAs, loginAsStudentB } from './fixtures/auth';

test.describe('student self-service boundaries', () => {
  test('student can open own profile, academics, leave, notifications and change password surfaces', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    for (const path of ['/profile', '/academics/ct-marks', '/scholarship', '/summer-activity', '/attendance', '/leave-permission', '/notifications']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
    }
    await page.goto('/profile');
    await page.getByRole('link', { name: /Change Password/i }).click();
    await expect(page).toHaveURL(/\/change-password$/);
  });

  test('student cannot see another student selector or admin directory', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/academics/ct-marks');
    await expect(page.getByText(/Select Student|Student Directory/i)).toHaveCount(0);
    await page.goto('/admin/students');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('eligible student sees Abdul Kalam tab and can access attendance history', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/dashboard');
    if ((await page.evaluate(() => window.innerWidth)) >= 1024) {
      await expect(page.getByRole('link', { name: 'Abdul Kalam Class', exact: true })).toBeVisible();
    }
    await page.goto('/attendance/abdul-kalam');
    await expect(page.getByRole('heading', { name: 'My Abdul Kalam Attendance Log', exact: true })).toBeVisible();
  });

  test('ineligible student has tab hidden, direct URL blocked, and API blocked', async ({ page }) => {
    await loginAsStudentB(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Abdul Kalam Class', exact: true })).toHaveCount(0);

    // Direct URL navigation is blocked and redirected to dashboard
    await page.goto('/attendance/abdul-kalam');
    await expect(page).toHaveURL(/\/dashboard$/);

    // API submission is rejected with 403
    const apiRes = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: '11e5f6a1-b2c3-4d4e-8f3a-4b5c6d7e8f90', // Student B
        attendanceDate: '2026-11-04',
        sessionType: 'MORNING',
        status: 'PRESENT',
      },
    });
    expect(apiRes.status()).toBe(403);
  });
});
