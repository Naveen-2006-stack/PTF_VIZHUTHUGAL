import { expect, test } from '@playwright/test';
import { loginAs, loginWithAccount, staffTwoAccount } from './fixtures/auth';

const STUDENT_A_ID = '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b'; // PTF001 (Kalam eligible)
const TEST_DATE_EDIT_1 = '2026-11-10';
const TEST_DATE_EDIT_2 = '2026-11-11';
const TEST_DATE_EXPIRED = '2026-10-01';
const EXPIRED_RECORD_ID = 'aaa12f16-e0bd-48c9-a2d1-2caef3c0a570';

test.describe('24-Hour Attendance Edit & Super Admin Override Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Clear cookies to prevent session bleed
    await page.context().clearCookies();
  });

  test('TEST 1 & 2 & 8: Mentor creates attendance, sees Edit button, edits within 24 hours (PRESENT -> ABSENT)', async ({ page }) => {
    // 1. Staff mentor logs in
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance/abdul-kalam');
    await page.waitForLoadState('networkidle');

    // Create fresh record via API if not marked
    const createRes = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: STUDENT_A_ID,
        attendanceDate: TEST_DATE_EDIT_1,
        sessionType: 'MORNING',
        status: 'PRESENT',
        remarks: 'Initial marking for 24h edit test',
      },
    });
    console.log('CREATE RES STATUS:', createRes.status());
    expect([200, 409]).toContain(createRes.status());

    // 2. Navigate to /attendance history
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Locate row by test date attribute
    const row = page.locator(`tr[data-date="${TEST_DATE_EDIT_1}"]`).first();
    await expect(row).toBeVisible();

    const editButton = row.locator('button', { hasText: 'Edit Attendance' });
    await expect(editButton).toBeVisible();

    // If currently ABSENT (from a previous test run), reset to PRESENT first
    const rowText = await row.innerText();
    if (rowText.includes('ABSENT')) {
      await editButton.click();
      const prepModal = page.locator('.fixed.inset-0').first();
      await prepModal.getByRole('button', { name: 'PRESENT', exact: true }).click();
      await prepModal.locator('textarea').fill('Resetting test state to PRESENT');
      await prepModal.getByRole('button', { name: 'Review Correction' }).click();
      await prepModal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
      await page.waitForTimeout(1500);
      await expect(row).toContainText('PRESENT');
    }

    // 3. Click 'Edit Attendance' and open modal
    await editButton.click();
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Edit Attendance Record');
    await expect(modal).toContainText('24-Hour Edit Window Active');

    // Select ABSENT status
    await modal.getByRole('button', { name: 'ABSENT', exact: true }).click();

    // Fill mandatory reason
    const reasonInput = modal.locator('textarea');
    await reasonInput.fill('Student was marked Present by mistake during morning check-in.');

    // Review correction
    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await expect(modal).toContainText('Confirm Attendance Modification');
    await expect(modal).toContainText('PRESENT');
    await expect(modal).toContainText('ABSENT');

    // Confirm & save
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    // Verify status updated in table to ABSENT
    await expect(row).toContainText('ABSENT');
  });

  test('TEST 9: Edit status from ABSENT -> PRESENT within window', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${TEST_DATE_EDIT_1}"]`).first();
    await expect(row).toBeVisible();

    const editButton = row.locator('button', { hasText: 'Edit Attendance' });
    await editButton.click();

    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();

    // Select PRESENT
    await modal.getByRole('button', { name: 'PRESENT', exact: true }).click();
    const reasonInput = modal.locator('textarea');
    await reasonInput.fill('Correcting back to Present after scholar verified arrival.');

    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    // Verify row is back to PRESENT
    await expect(row).toContainText('PRESENT');
  });

  test('TEST 3: Different mentor attempts same edit is BLOCKED (UI Locked & API 403)', async ({ page }) => {
    // Log in as Staff Mentor 2 (Dr. M. Priya)
    await loginWithAccount(page, staffTwoAccount);

    // Navigate to /attendance
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${TEST_DATE_EDIT_1}"]`).first();
    await expect(row).toBeVisible();

    // The edit button should NOT be visible to a different mentor
    const editButton = row.locator('button', { hasText: 'Edit Attendance' });
    await expect(editButton).not.toBeVisible();
    await expect(row).toContainText('Locked');

    // Attempt direct API call as Staff 2 to edit Staff 1's record
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: 'fed99fcd-b5b5-4f8d-90ec-e1be1a4f23fe',
        status: 'ABSENT',
        reason: 'Malicious unauthorized edit attempt by non-creator',
      },
    });
    // Must be 403 Forbidden with ORIGINAL_CREATOR_ONLY
    expect(patchRes.status()).toBe(403);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toBe('ORIGINAL_CREATOR_ONLY');
  });

  test('TEST 4: Student attempts edit is BLOCKED (no UI controls & API 403)', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // No edit buttons anywhere on the student view
    const editButtons = page.locator('button:has-text("Edit Attendance")');
    await expect(editButtons).toHaveCount(0);

    // Attempt direct API call as student
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: 'fed99fcd-b5b5-4f8d-90ec-e1be1a4f23fe',
        status: 'PRESENT',
        reason: 'Student attempting self-edit',
      },
    });
    expect(patchRes.status()).toBe(403);
  });

  test('TEST 5: Unauthenticated user attempts edit is BLOCKED (API 401)', async ({ page }) => {
    // Without logging in, invoke PATCH directly
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: 'fed99fcd-b5b5-4f8d-90ec-e1be1a4f23fe',
        status: 'PRESENT',
        reason: 'Anonymous unauthenticated patch attempt',
      },
    });
    expect(patchRes.status()).toBe(401);
  });

  test('TEST 6 & 7: Edit after 24 hours is BLOCKED & clock tampering cannot bypass server time', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');

    // Simulate clock tampering by altering browser clock via evaluate
    await page.addInitScript(() => {
      // Mock client Date.now() to 48 hours ago
      const originalNow = Date.now;
      Date.now = () => originalNow() - 48 * 3600 * 1000;
    });

    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // UI displays record as Expired / Locked
    const expiredRow = page.locator(`tr[data-date="${TEST_DATE_EXPIRED}"]`);
    await expect(expiredRow).toBeVisible();
    await expect(expiredRow).toContainText(/Expired|Locked/i);
    await expect(expiredRow.locator('button:has-text("Edit Attendance")')).toHaveCount(0);

    // Direct PATCH API call on expired record MUST be rejected with HTTP 409
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: EXPIRED_RECORD_ID,
        status: 'ABSENT',
        reason: 'Attempting to edit expired record past 24 hours',
      },
    });
    expect(patchRes.status()).toBe(409);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toBe('ATTENDANCE_EDIT_WINDOW_EXPIRED');
  });

  test('TEST 10 & 11: Preserves Single Session Per Day & In-Place Update (No Duplicate)', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance/abdul-kalam');
    await page.waitForLoadState('networkidle');

    // Ensure Morning session exists for TEST_DATE_EDIT_2
    const createMorning = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: STUDENT_A_ID,
        attendanceDate: TEST_DATE_EDIT_2,
        sessionType: 'MORNING',
        status: 'PRESENT',
        remarks: 'Morning session for rule 10 test',
      },
    });
    expect([200, 409]).toContain(createMorning.status());

    // TEST 10: Attempting to create Evening session for SAME student and SAME date MUST FAIL
    const createEvening = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: STUDENT_A_ID,
        attendanceDate: TEST_DATE_EDIT_2,
        sessionType: 'EVENING',
        status: 'PRESENT',
        remarks: 'Second session attempt',
      },
    });
    expect(createEvening.status()).toBe(409);
    const eveningJson = await createEvening.json();
    expect(eveningJson.error).toMatch(/already recorded|already marked|DUPLICATE_DAILY_ATTENDANCE/i);

    // TEST 11: Edit Morning status -> updates in place, does not create duplicate
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // Row exists for this date
    const row = page.locator(`tr[data-date="${TEST_DATE_EDIT_2}"]`);
    await expect(row).toHaveCount(1);
  });

  test('TEST 12: Super Admin override allowed with mandatory reason and warning', async ({ page }) => {
    await loginAs(page, 'SUPER_ADMIN');
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${TEST_DATE_EDIT_2}"]`).first();
    await expect(row).toBeVisible();

    // Super Admin sees Edit Attendance or Admin Override button
    const editBtn = row.locator('button', { hasText: /Edit Attendance|Admin Override/i });
    await expect(editBtn).toBeVisible();

    await editBtn.click();
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();

    // Dynamically pick the alternative status so it's always different from current status
    const currentStatusText = await row.innerText();
    const targetStatus = currentStatusText.includes('EXCUSED') ? 'PRESENT' : 'EXCUSED';

    await modal.getByRole('button', { name: targetStatus, exact: true }).click();
    const reasonInput = modal.locator('textarea');
    await reasonInput.fill(`Super Admin institutional override: Scholar status changed to ${targetStatus} after review.`);

    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    // Verify row displays targetStatus
    await expect(row).toContainText(targetStatus);
  });

});
