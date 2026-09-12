import { expect, test } from '@playwright/test';
import { loginWithAccount, qaAccounts } from './fixtures/auth';
import {
  setAttendanceCreatedAt,
  getAttendanceRecord,
  getLatestAuditRecord,
  generateTestDate,
} from './helpers/attendance-test-helper';

test.describe('24-Hour Attendance Edit Feature — Authoritative QA Dataset Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // Helper to create initial attendance via API
  async function createInitialAttendance(page: any, {
    studentId,
    attendanceDate,
    sessionType = 'MORNING',
    status = 'PRESENT',
    remarks = 'QA automated initial marking',
  }: {
    studentId: string;
    attendanceDate: string;
    sessionType?: string;
    status?: string;
    remarks?: string;
  }) {
    let targetDate = attendanceDate;
    let recordId: string | undefined;
    let res: any;
    let json: any;
    let attempts = 0;

    while (!recordId && attempts < 5) {
      if (attempts > 0) {
        targetDate = generateTestDate();
      }
      res = await page.request.post('/api/attendance/abdul-kalam', {
        data: {
          studentId,
          attendanceDate: targetDate,
          sessionType,
          status,
          remarks,
        },
      });
      try {
        json = await res.json();
        recordId = json.records?.[0]?.id;
      } catch {}
      attempts++;
    }

    return { status: res?.status() || 500, recordId, json, targetDate };
  }

  // ---------------------------------------------------------------------------
  // TEST 1 — EDIT WITHIN 1 HOUR
  // ---------------------------------------------------------------------------
  test('TEST 1: Edit within 1 hour succeeds, updates in-place, creates audit log', async ({ page }) => {
    const testDate = generateTestDate();

    // 1. Staff Mentor A logs in and creates attendance
    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();
    const dateToFind = targetDate || testDate;

    // Set created_at to ~1 hour ago (60 minutes)
    await setAttendanceCreatedAt(recordId, 60);

    // 2. Open Attendance History
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('PRESENT');

    const editButton = row.locator('button', { hasText: 'Edit Attendance' });
    await expect(editButton).toBeVisible();

    // 3. Perform Edit: PRESENT -> ABSENT
    await editButton.click();
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('24-Hour Edit Window Active');

    await modal.getByRole('button', { name: 'ABSENT', exact: true }).click();
    await modal.locator('textarea').fill('Correction within 1h: Student was marked Present by mistake.');
    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    // 4. Verify UI updated
    await expect(row).toContainText('ABSENT');

    // 5. Verify database record
    const updated = await getAttendanceRecord(recordId);
    expect(updated.status).toBe('ABSENT');
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(updated.created_at).getTime());

    // 6. Verify audit history
    const audit = await getLatestAuditRecord(recordId);
    expect(audit).toBeDefined();
    expect(audit.previous_status).toBe('PRESENT');
    expect(audit.new_status).toBe('ABSENT');
    expect(audit.edited_by).toBe(qaAccounts.staffMentorA.id);
    expect(audit.reason).toContain('Correction within 1h');
  });

  // ---------------------------------------------------------------------------
  // TEST 2 — 23 HOURS 59 MINUTES
  // ---------------------------------------------------------------------------
  test('TEST 2: Edit at 23 hours 59 minutes (just before expiry) is ALLOWED', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'ABSENT',
    });
    expect(recordId).toBeDefined();
    const dateToFind = targetDate || testDate;

    // Set created_at to 23 hours 59 minutes ago (1439 minutes)
    await setAttendanceCreatedAt(recordId, 1439);

    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await expect(row).toBeVisible();

    const editButton = row.locator('button', { hasText: 'Edit Attendance' });
    await expect(editButton).toBeVisible();

    await editButton.click();
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: 'PRESENT', exact: true }).click();
    await modal.locator('textarea').fill('Correction at 23h 59m boundary: Scholar present.');
    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    await expect(row).toContainText('PRESENT');
  });

  // ---------------------------------------------------------------------------
  // TEST 3 — 24 HOURS 1 MINUTE
  // ---------------------------------------------------------------------------
  test('TEST 3: Edit at 24 hours 1 minute is BLOCKED by server timestamp', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();
    const dateToFind = targetDate || testDate;

    // Set created_at to 24 hours 1 minute ago (1441 minutes)
    await setAttendanceCreatedAt(recordId, 1441);

    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Locked|Expired/i);
    await expect(row.locator('button:has-text("Edit Attendance")')).toHaveCount(0);

    // Direct API attempt MUST be rejected with HTTP 409
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'ABSENT',
        reason: 'Attempting edit 1 minute past window',
      },
    });
    expect(patchRes.status()).toBe(409);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toBe('ATTENDANCE_EDIT_WINDOW_EXPIRED');

    // Database remains unchanged
    const record = await getAttendanceRecord(recordId);
    expect(record.status).toBe('PRESENT');
  });

  // ---------------------------------------------------------------------------
  // TEST 4 — DIFFERENT STAFF/MENTOR
  // ---------------------------------------------------------------------------
  test('TEST 4: Different Staff/Mentor cannot edit another mentor record (UI locked, API 403)', async ({ page }) => {
    const testDate = generateTestDate();

    // 1. Created by Mentor A
    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();
    const dateToFind = targetDate || testDate;
    await setAttendanceCreatedAt(recordId, 30); // 30 mins ago

    // 2. Login as Mentor B
    await loginWithAccount(page, qaAccounts.staffMentorB);
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Locked');
    await expect(row.locator('button:has-text("Edit Attendance")')).toHaveCount(0);

    // 3. Direct API call as Mentor B must return 403 ORIGINAL_CREATOR_ONLY
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'ABSENT',
        reason: 'Unauthorized mentor edit attempt',
      },
    });
    expect(patchRes.status()).toBe(403);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toBe('ORIGINAL_CREATOR_ONLY');
  });

  // ---------------------------------------------------------------------------
  // TEST 5 — STUDENT ATTEMPT
  // ---------------------------------------------------------------------------
  test('TEST 5: Student cannot edit attendance (no UI controls, direct API 403)', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    // Login as Student QA001
    await loginWithAccount(page, qaAccounts.studentQA001);
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // No edit buttons anywhere on student surface
    const editBtns = page.locator('button:has-text("Edit Attendance")');
    await expect(editBtns).toHaveCount(0);

    // Direct PATCH API attempt
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'ABSENT',
        reason: 'Student attempting self modification',
      },
    });
    expect(patchRes.status()).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // TEST 6 — DEVICE CLOCK MANIPULATION
  // ---------------------------------------------------------------------------
  test('TEST 6: Device clock manipulation cannot bypass server timestamp', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    // Set created_at to 30 hours ago
    await setAttendanceCreatedAt(recordId, 1800);

    // Mock client browser Date.now to 28 hours in the past
    await page.addInitScript(() => {
      const originalNow = Date.now;
      Date.now = () => originalNow() - 28 * 3600 * 1000;
    });

    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // Server-side verification strictly rejects API request
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'ABSENT',
        reason: 'Bypassing with spoofed client time',
      },
    });
    expect(patchRes.status()).toBe(409);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toBe('ATTENDANCE_EDIT_WINDOW_EXPIRED');
  });

  // ---------------------------------------------------------------------------
  // TEST 7 — EDIT STATUS ONLY & IMMUTABLE FIELDS
  // ---------------------------------------------------------------------------
  test('TEST 7: Edit status to LATE succeeds; immutable fields cannot be altered', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    // 1. Valid status edit: PRESENT -> LATE
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${testDate}"]`).first();
    await row.locator('button', { hasText: 'Edit Attendance' }).click();

    const modal = page.locator('.fixed.inset-0').first();
    await modal.getByRole('button', { name: 'LATE', exact: true }).click();
    await modal.locator('textarea').fill('Scholar arrived 20 minutes late to session.');
    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    await expect(row).toContainText('LATE');

    // 2. Malicious payload attempting to alter immutable fields
    await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'PRESENT',
        studentId: '00000000-0000-0000-0000-000000000000',
        attendanceDate: '2099-01-01',
        sessionType: 'EVENING',
        mentorId: '00000000-0000-0000-0000-000000000000',
        createdAt: '2020-01-01T00:00:00Z',
        reason: 'Attempting malicious field override',
      },
    });

    // Verify in database: immutable fields remained identical
    const record = await getAttendanceRecord(recordId);
    expect(record.student_id).toBe(qaAccounts.studentQA001.id);
    expect(record.attendance_date).toBe(testDate);
    expect(record.session_type).toBe('MORNING');
    expect(record.mentor_id).toBe(qaAccounts.staffMentorA.id);
  });

  // ---------------------------------------------------------------------------
  // TEST 8 — SAME DAY SECOND SESSION
  // ---------------------------------------------------------------------------
  test('TEST 8: Same-day second session creation is BLOCKED by UNIQUE constraint', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);

    // 1. First session (MORNING) succeeds
    const firstRes = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: qaAccounts.studentQA001.id,
        attendanceDate: testDate,
        sessionType: 'MORNING',
        status: 'PRESENT',
        remarks: 'First session today',
      },
    });
    expect(firstRes.status()).toBe(200);

    // 2. Second session (EVENING) on same date MUST be blocked with 409
    const secondRes = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: qaAccounts.studentQA001.id,
        attendanceDate: testDate,
        sessionType: 'EVENING',
        status: 'PRESENT',
        remarks: 'Second session attempt',
      },
    });
    expect(secondRes.status()).toBe(409);
    const secondJson = await secondRes.json();
    expect(secondJson.error).toMatch(/already recorded|already marked|DUPLICATE_DAILY_ATTENDANCE/i);
  });

  // ---------------------------------------------------------------------------
  // TEST 9 — EDIT DOES NOT CREATE A SECOND RECORD
  // ---------------------------------------------------------------------------
  test('TEST 9: Edit updates existing row in-place without creating duplicate record', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    const dateToFind = targetDate || testDate;

    // Edit PRESENT -> ABSENT
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await row.locator('button', { hasText: 'Edit Attendance' }).click();

    const modal = page.locator('.fixed.inset-0').first();
    await modal.getByRole('button', { name: 'ABSENT', exact: true }).click();
    await modal.locator('textarea').fill('Marking absent after roll verification.');
    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    // Query all rows for this student on testDate
    const rows = page.locator(`tr[data-date="${dateToFind}"]`);
    await expect(rows).toHaveCount(1);
  });

  // ---------------------------------------------------------------------------
  // TEST 10 — AUDIT TRAIL
  // ---------------------------------------------------------------------------
  test('TEST 10: Audit trail records comprehensive history with mandatory reason', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    const testReason = 'Audit verification: Roll-call discrepancy corrected immediately.';

    await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'ABSENT',
        reason: testReason,
      },
    });

    const audit = await getLatestAuditRecord(recordId);
    expect(audit).toBeDefined();
    expect(audit.attendance_id).toBe(recordId);
    expect(audit.student_id).toBe(qaAccounts.studentQA001.id);
    expect(audit.previous_status).toBe('PRESENT');
    expect(audit.new_status).toBe('ABSENT');
    expect(audit.original_marked_by).toBe(qaAccounts.staffMentorA.id);
    expect(audit.edited_by).toBe(qaAccounts.staffMentorA.id);
    expect(audit.reason).toBe(testReason);
    expect(audit.is_super_admin_override).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // TEST 11 — AFTER 24 HOURS
  // ---------------------------------------------------------------------------
  test('TEST 11: After 24 hours UI displays [Locked] and direct API is rejected', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();
    const dateToFind = targetDate || testDate;

    // Expire window (30 hours ago)
    await setAttendanceCreatedAt(recordId, 1800);

    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Locked|Expired/i);
    await expect(row.locator('button:has-text("Edit Attendance")')).toHaveCount(0);

    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: recordId,
        status: 'EXCUSED',
        reason: 'Attempting late edit as mentor',
      },
    });
    expect(patchRes.status()).toBe(409);
  });

  // ---------------------------------------------------------------------------
  // TEST 12 — SUPER ADMIN OVERRIDE
  // ---------------------------------------------------------------------------
  test('TEST 12: Super Admin override allowed after 24h with reason, warning, and audit log', async ({ page }) => {
    const testDate = generateTestDate();

    // 1. Mentor creates attendance and window expires (30 hours ago)
    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId, targetDate } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();
    const dateToFind = targetDate || testDate;
    await setAttendanceCreatedAt(recordId, 1800);

    // 2. Super Admin logs in
    await loginWithAccount(page, qaAccounts.superAdmin);
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${dateToFind}"]`).first();
    await expect(row).toBeVisible();

    const overrideBtn = row.locator('button', { hasText: /Admin Override|Edit Attendance/i });
    await expect(overrideBtn).toBeVisible();

    await overrideBtn.click();
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Super Admin Override Active|Administrative Attendance Override/i);

    // Change to EXCUSED
    await modal.getByRole('button', { name: 'EXCUSED', exact: true }).click();
    const reasonText = 'Super Admin Override: Scholar was representing university at conference.';
    await modal.locator('textarea').fill(reasonText);

    await modal.getByRole('button', { name: 'Review Correction' }).click();
    await modal.getByRole('button', { name: 'Confirm & Save Correction' }).click();
    await page.waitForTimeout(1500);

    await expect(row).toContainText('EXCUSED');

    // Verify audit entry has is_super_admin_override = true
    const audit = await getLatestAuditRecord(recordId);
    expect(audit).toBeDefined();
    expect(audit.is_super_admin_override).toBe(true);
    expect(audit.edited_by).toBe(qaAccounts.superAdmin.id);
  });

  // ---------------------------------------------------------------------------
  // TEST 13 — ELIGIBILITY
  // ---------------------------------------------------------------------------
  test('TEST 13: QA001 is eligible for attendance; QA002 is ineligible and blocked', async ({ page }) => {
    const testDate = generateTestDate();

    // 1. Staff can mark QA001 (Eligible)
    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    // 2. Staff cannot mark QA002 (Ineligible) -> rejected by eligibility check
    const testDateQA002 = generateTestDate();
    const ineligibleRes = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: qaAccounts.studentQA002.id,
        attendanceDate: testDateQA002,
        sessionType: 'MORNING',
        status: 'PRESENT',
      },
    });
    expect(ineligibleRes.status()).toBe(409); // rejected with error
    const ineligJson = await ineligibleRes.json();
    expect(ineligJson.error).toMatch(/not eligible/i);

    // 3. QA002 Student cannot see or access Abdul Kalam attendance
    await loginWithAccount(page, qaAccounts.studentQA002);
    await page.goto('/attendance/abdul-kalam');
    await expect(page).toHaveURL(/\/(dashboard|attendance)$/);
  });

  // ---------------------------------------------------------------------------
  // TEST 14 — CONCURRENT REQUEST
  // ---------------------------------------------------------------------------
  test('TEST 14: Concurrent edit requests execute safely without corrupted state', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const { recordId } = await createInitialAttendance(page, {
      studentId: qaAccounts.studentQA001.id,
      attendanceDate: testDate,
      sessionType: 'MORNING',
      status: 'PRESENT',
    });
    expect(recordId).toBeDefined();

    // Fire 2 simultaneous edit requests
    const [resA, resB] = await Promise.all([
      page.request.patch('/api/attendance/abdul-kalam', {
        data: { attendanceId: recordId, status: 'ABSENT', reason: 'Concurrent request A' },
      }),
      page.request.patch('/api/attendance/abdul-kalam', {
        data: { attendanceId: recordId, status: 'LATE', reason: 'Concurrent request B' },
      }),
    ]);

    expect([200, 400]).toContain(resA.status());
    expect([200, 400]).toContain(resB.status());

    // Verify record state is valid
    const record = await getAttendanceRecord(recordId);
    expect(['ABSENT', 'LATE']).toContain(record.status);
  });

  // ---------------------------------------------------------------------------
  // TEST 15 — SECURITY BYPASS
  // ---------------------------------------------------------------------------
  test('TEST 15: Malicious and unauthorized edit attempts are strictly blocked', async ({ page }) => {
    // 1. Unauthenticated PATCH
    const unauthRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: { attendanceId: '00000000-0000-0000-0000-000000000000', status: 'PRESENT', reason: 'Hack' },
    });
    expect(unauthRes.status()).toBe(401);

    await loginWithAccount(page, qaAccounts.staffMentorA);

    // 2. Non-existent record ID
    const notFoundRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: { attendanceId: '00000000-0000-0000-0000-000000000000', status: 'PRESENT', reason: 'Valid reason' },
    });
    expect(notFoundRes.status()).toBe(404);

    // 3. Invalid status value
    const invalidStatusRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: { attendanceId: '00000000-0000-0000-0000-000000000000', status: 'INVALID_STATUS', reason: 'Valid reason' },
    });
    expect(invalidStatusRes.status()).toBe(400);

    // 4. Missing reason
    const noReasonRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: { attendanceId: '00000000-0000-0000-0000-000000000000', status: 'ABSENT', reason: '' },
    });
    expect(noReasonRes.status()).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // TEST 16 — ROLE BOUNDARY
  // ---------------------------------------------------------------------------
  test('TEST 16: Strict role boundaries enforced across portal modules', async ({ page }) => {
    // 1. STAFF_MENTOR cannot access administrative student directories or CT marks (redirected to authorized staff view)
    await loginWithAccount(page, qaAccounts.staffMentorA);
    await page.goto('/admin/students');
    await expect(page).toHaveURL(/\/(attendance\/abdul-kalam|dashboard)(?:\?.*)?$/);

    await page.goto('/academics/ct-marks');
    await expect(page).toHaveURL(/\/(attendance\/abdul-kalam|dashboard)(?:\?.*)?$/);

    // 2. PTF_SECRETARY cannot mutate attendance
    await loginWithAccount(page, qaAccounts.secretary);
    const secRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: { attendanceId: '00000000-0000-0000-0000-000000000000', status: 'PRESENT', reason: 'Secretary mutation' },
    });
    expect(secRes.status()).toBe(403);

    // 3. SEMI_ADMIN cannot override expired attendance
    await loginWithAccount(page, qaAccounts.semiAdmin);
    const semiRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: { attendanceId: '00000000-0000-0000-0000-000000000000', status: 'PRESENT', reason: 'Semi admin mutation' },
    });
    expect(semiRes.status()).toBe(403);
  });

});
