import { expect, test, loginAs } from './fixtures/auth';

const adminPages = [
  ['/dashboard', /PTF Vizhuthugal Institutional Overview/i],
  ['/admin/students', /Student Management & Bulk Import/i],
  ['/admin/staff', /Staff/i],
  ['/staff-mapping', /Staff.*Mapping/i],
  ['/admin/mentors', /Abdul Kalam|Eligibility/i],
  ['/academics/ct-marks', /CT|Academic/i],
  ['/scholarship', /Scholarship/i],
  ['/summer-activity', /Summer/i],
  ['/attendance', /Attendance/i],
  ['/leave-permission', /Leave|Permission/i],
  ['/notifications', /Notification/i],
  ['/admin/reports', /Report/i],
  ['/admin/audit-logs', /Audit/i],
  ['/settings', /Settings/i],
] as const;

test.describe('Super Admin operational pages', () => {
  test('can open every Super Admin module without a fatal page error', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    for (const [path, heading] of adminPages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('main').getByText(heading).first()).toBeVisible();
    }
  });

  test('student import supports CSV and XLSX inputs and previews safe invalid data', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/admin/students');
    await page.getByRole('button', { name: 'Bulk Import (CSV/XLSX)' }).click();

    const fileInput = page.locator('input[type="file"]').last();
    await expect(fileInput).toHaveAttribute('accept', /\.csv/);
    await expect(fileInput).toHaveAttribute('accept', /\.xlsx/);

    await fileInput.setInputFiles({
      name: 'invalid-student.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,register_number,campus_code,department_code,course_code\nInvalid User,TEST-UNIQUE,NOT_A_CAMPUS,NOT_A_DEPT,NOT_A_COURSE\n'),
    });
    await expect(page.getByText(/Data Preview \(1 Rows Detected\)/)).toBeVisible();
    await expect(page.getByText('Invalid User')).toBeVisible();

    const cancel = page.getByRole('button', { name: /Cancel|Close/i }).last();
    if (await cancel.isVisible()) await cancel.click();
  });
});
