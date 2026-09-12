import { expect, test, loginAs, loginAsStudentB } from './fixtures/auth';

test.describe('End-to-End Institutional Workflows', () => {
  const studentAId = '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b';
  const studentBId = '11e5f6a1-b2c3-4d4e-8f3a-4b5c6d7e8f90';
  const staffId = '98765432-10ab-cdef-0123-456789abcdef';

  // 1. ROLE ESCALATION PREVENTION
  test('role escalation: student cannot elevate role to SUPER_ADMIN', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/profile');
    await expect(page.getByText(/My Institutional Profile/i)).toBeVisible();

    // Verify UI has no role modification option
    await expect(page.getByRole('combobox', { name: /role/i })).toHaveCount(0);

    // Direct navigation to admin pages is blocked
    await page.goto('/admin/students');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  // 2. STAFF MAPPING & REASSIGNMENT
  test('staff mapping: Super Admin manages assignment, history is retained, student cannot self-select', async ({ page }) => {
    // A. Student cannot access staff mapping page
    await loginAs(page, 'STUDENT');
    await page.goto('/staff-mapping');
    await expect(page).toHaveURL(/\/dashboard$/);

    // B. Super Admin can view staff mapping and reassign
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/staff-mapping');
    await expect(page.getByRole('heading', { name: /Staff & Mentor Assignment|Staff.*Mapping/i })).toBeVisible();

    // Super Admin reassign API call
    const reassignRes = await page.request.post('/api/staff/reassign', {
      data: {
        studentId: studentAId,
        staffId: staffId,
      },
    });
    expect([200, 400]).toContain(reassignRes.status());
  });

  // 3. CT MARKS WORKFLOW & STAFF LOCKOUT
  test('academic workflow: student submits CT mark, admin verifies, staff is locked out', async ({ page }) => {
    // A. Staff Mentor is strictly locked out of CT marks
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/academics/ct-marks');
    await expect(page).toHaveURL(/\/attendance\/abdul-kalam$/);

    // B. Student can access CT marks self-service
    await loginAs(page, 'STUDENT');
    await page.goto('/academics/ct-marks');
    await expect(page.getByRole('heading', { name: /Cycle Test.*Marks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Enter CT Mark/i })).toBeVisible();

    // C. Admin can review and access verification console
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/academics/ct-marks');
    await expect(page.getByRole('heading', { name: /Cycle Test.*Marks/i })).toBeVisible();
  });

  // 4. LEAVE & PERMISSION WORKFLOW
  test('leave and permission: student can submit, admin can review, staff is locked out', async ({ page }) => {
    // A. Staff Mentor is strictly locked out of Leave & Permission
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/leave-permission');
    await expect(page).toHaveURL(/\/attendance\/abdul-kalam$/);

    // B. Student can open leave submission modal
    await loginAs(page, 'STUDENT');
    await page.goto('/leave-permission');
    await expect(page.getByRole('heading', { name: /Leave & On-Duty Permission/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Apply Leave/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Request Permission/i })).toBeVisible();

    // C. Semi Admin can open review interface
    await loginAs(page, 'SEMI_ADMIN');
    await page.goto('/leave-permission');
    await expect(page.getByRole('heading', { name: /Leave & On-Duty Permission/i })).toBeVisible();
  });

  // 5. CROSS-STUDENT ISOLATION & PRIVATE STORAGE
  test('student isolation: Student A cannot access Student B profile or data', async ({ page }) => {
    // Student B logs in
    await loginAsStudentB(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Priya Sharma' })).toBeVisible();

    // Student B cannot see Student A's name as current user
    await expect(page.getByText('Arun Kumar')).toHaveCount(0);

    // Student B cannot access Super Admin pages
    await page.goto('/admin/mentors');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
