import { expect, test, loginAs } from './fixtures/auth';

const protectedApis = [
  ['/api/import/students', { students: [] }],
  ['/api/import/eligibility', { records: [] }],
  ['/api/staff/reassign', { studentId: '00000000-0000-0000-0000-000000000000', staffId: '00000000-0000-0000-0000-000000000000' }],
  ['/api/attendance/abdul-kalam', { studentId: '00000000-0000-0000-0000-000000000000', attendanceDate: '2099-01-01', sessionType: 'MORNING', status: 'PRESENT' }],
] as const;

test.describe('API authorization and security boundaries', () => {
  for (const [path, body] of protectedApis) {
    test(`unauthenticated ${path} is rejected`, async ({ request }) => {
      const response = await request.post(path, { data: body });
      expect(response.status()).toBe(401);
    });
  }

  test('student cannot call Super Admin import or reassignment APIs', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    for (const [path, body] of protectedApis.slice(0, 3)) {
      const response = await page.request.post(path, { data: body });
      expect(response.status()).toBe(403);
    }
  });

  test('staff mentor cannot call Super Admin APIs', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    for (const [path, body] of protectedApis.slice(0, 3)) {
      const response = await page.request.post(path, { data: body });
      expect(response.status()).toBe(403);
    }
  });

  test('student cannot self-escalate through the profile UI surface', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/profile');
    await expect(page.getByText(/My Institutional Profile/i)).toBeVisible();
    await expect(page.getByText(/SUPER_ADMIN/i)).toHaveCount(0);
    await page.goto('/admin/students');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
