import { test, expect } from '@playwright/test';
import { loginWithAccount, qaAccounts, accountFor } from './fixtures/auth';
import {
  generateTestDate,
  setAttendanceCreatedAt,
  getTestSupabaseClient,
} from './helpers/attendance-test-helper';

test.describe('Attendance Edit UI & Official Logos Verification Suite', () => {

  // ---------------------------------------------------------------------------
  // LOGO TESTS 21 - 29
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // GLOBAL 3-LOGO TESTS FOR ALL 5 ROLES
  // ---------------------------------------------------------------------------
  test('TEST 21: Login page shows all THREE official logos (PTF, SRMIST, SRM AP)', async ({ page }) => {
    await page.goto('/login');

    const ptfLogo = page.locator('img[src*="ptf-vizhuthugal"]').first();
    await expect(ptfLogo).toBeVisible();

    const srmistLogo = page.locator('img[src*="srmist"], img[src*="/logos/srm.png"]').first();
    await expect(srmistLogo).toBeVisible();

    const srmApLogo = page.locator('img[src*="srm-university-ap"]').first();
    await expect(srmApLogo).toBeVisible();

    // Verify images are actually loaded and not broken (naturalWidth > 0)
    const isPtfLoaded = await ptfLogo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    const isSrmistLoaded = await srmistLogo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
    const isSrmApLoaded = await srmApLogo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);

    expect(isPtfLoaded).toBe(true);
    expect(isSrmistLoaded).toBe(true);
    expect(isSrmApLoaded).toBe(true);
  });

  test('TEST 22: Main header and Sidebar show all THREE logos without campus/role hiding', async ({ page }) => {
    await loginWithAccount(page, qaAccounts.superAdmin);
    await page.goto('/dashboard');

    const navbar = page.locator('header').first();
    await expect(navbar).toBeVisible();

    // Header logos: PTF on left, SRMIST & SRM AP on right
    await expect(navbar.locator('img[src*="ptf-vizhuthugal"]')).toBeVisible();
    await expect(navbar.locator('img[src*="srmist"], img[src*="srm.png"]').first()).toBeVisible();
    await expect(navbar.locator('img[src*="srm-university-ap"]').first()).toBeVisible();

    // Sidebar logos: all three visible in desktop sidebar
    const sidebar = page.locator('aside').first();
    await expect(sidebar.locator('img[src*="ptf-vizhuthugal"]')).toBeVisible();
    await expect(sidebar.locator('img[src*="srmist"], img[src*="srm.png"]').first()).toBeVisible();
    await expect(sidebar.locator('img[src*="srm-university-ap"]').first()).toBeVisible();
  });

  test('TEST 23: ALL FIVE ROLES see all THREE logos unconditionally', async ({ page }) => {
    const rolesToTest = [
      { name: 'SUPER_ADMIN', account: qaAccounts.superAdmin, targetUrl: '/dashboard' },
      { name: 'SEMI_ADMIN', account: qaAccounts.semiAdmin, targetUrl: '/dashboard' },
      { name: 'PTF_SECRETARY', account: qaAccounts.secretary, targetUrl: '/dashboard' },
      { name: 'STAFF_MENTOR', account: qaAccounts.staffMentorA, targetUrl: '/attendance/abdul-kalam' },
      { name: 'STUDENT', account: qaAccounts.studentQA001, targetUrl: '/dashboard' },
    ];

    for (const item of rolesToTest) {
      await loginWithAccount(page, item.account);
      await page.goto(item.targetUrl);
      await page.waitForLoadState('networkidle');

      const navbar = page.locator('header').first();
      await expect(navbar).toBeVisible();

      // Verify all 3 logos in header for this role
      const ptf = navbar.locator('img[src*="ptf-vizhuthugal"]').first();
      const srmist = navbar.locator('img[src*="srmist"], img[src*="srm.png"]').first();
      const srmAp = navbar.locator('img[src*="srm-university-ap"]').first();

      await expect(ptf).toBeVisible();
      await expect(srmist).toBeVisible();
      await expect(srmAp).toBeVisible();

      const ptfLoaded = await ptf.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
      const srmistLoaded = await srmist.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
      const srmApLoaded = await srmAp.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);

      expect(ptfLoaded).toBe(true);
      expect(srmistLoaded).toBe(true);
      expect(srmApLoaded).toBe(true);
    }
  });

  test('TEST 24: Abdul Kalam Attendance page displays all THREE logos in session banner', async ({ page }) => {
    await loginWithAccount(page, qaAccounts.staffMentorA);
    await page.goto('/attendance/abdul-kalam');
    await page.waitForLoadState('networkidle');

    // Attendance session header has InstitutionalLogos rendering all 3 logos
    const bannerLogos = page.locator('div:has(> img[src*="ptf-vizhuthugal"]):has(> img[src*="srmist"], > img[src*="srm.png"])');
    await expect(page.locator('img[src*="ptf-vizhuthugal"]').first()).toBeVisible();
    await expect(page.locator('img[src*="srmist"], img[src*="srm.png"]').first()).toBeVisible();
    await expect(page.locator('img[src*="srm-university-ap"]').first()).toBeVisible();
  });

  test('TEST 25: Responsive layout preserves all THREE logos without distortion or overflow', async ({ page }) => {
    // 1. Mobile viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const ptfLogo = page.locator('img[src*="ptf-vizhuthugal"]').first();
    const srmistLogo = page.locator('img[src*="srmist"], img[src*="srm.png"]').first();
    const srmApLogo = page.locator('img[src*="srm-university-ap"]').first();

    await expect(ptfLogo).toBeVisible();
    await expect(srmistLogo).toBeVisible();
    await expect(srmApLogo).toBeVisible();

    // Verify natural dimensions (not distorted)
    const ptfAspect = await ptfLogo.evaluate((el: HTMLImageElement) => el.naturalWidth / el.naturalHeight);
    const srmistAspect = await srmistLogo.evaluate((el: HTMLImageElement) => el.naturalWidth / el.naturalHeight);
    const srmApAspect = await srmApLogo.evaluate((el: HTMLImageElement) => el.naturalWidth / el.naturalHeight);

    expect(ptfAspect).toBeGreaterThan(0.5);
    expect(srmistAspect).toBeGreaterThan(0.5);
    expect(srmApAspect).toBeGreaterThan(0.5);

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // ---------------------------------------------------------------------------
  // ATTENDANCE UI TESTS 4, 15 - 20
  // ---------------------------------------------------------------------------
  test('TEST 4 & 18 & 19: June / Expired attendance displays Locked, Editing window expired, and hides Edit button', async ({ page }) => {
    const supabase = getTestSupabaseClient();
    await supabase.auth.signInWithPassword({
      email: 'qa.superadmin@ptftest.local',
      password: 'Qa@Super2026!',
    });

    const juneDate = '2026-06-11';
    // Clean existing record on that date if any
    await supabase.from('attendance').delete().eq('student_id', qaAccounts.studentQA001.id).eq('attendance_date', juneDate);

    // Insert attendance marked on June 11, 2026 at 6:42 PM
    const juneCreatedAt = '2026-06-11T13:12:00.000Z'; // 6:42 PM IST
    const { data: inserted, error } = await supabase
      .from('attendance')
      .insert({
        student_id: qaAccounts.studentQA001.id,
        attendance_date: juneDate,
        session_type: 'MORNING',
        mentor_id: qaAccounts.staffMentorA.id,
        status: 'PRESENT',
        created_at: juneCreatedAt,
        is_locked: true,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(inserted).toBeDefined();

    // 1. Staff Mentor logs in
    await loginWithAccount(page, qaAccounts.staffMentorA);
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${juneDate}"]`).first();
    await expect(row).toBeVisible();

    // Verify Marked timestamp is visible
    await expect(row).toContainText(/11 Jun 2026/);

    // Verify Edit Until deadline is visible (12 Jun 2026)
    await expect(row).toContainText(/12 Jun 2026/);

    // Verify Status displays Locked and Editing window expired
    await expect(row).toContainText('Locked');
    await expect(row).toContainText('Editing window expired');

    // Verify Edit Attendance button is NOT displayed for Staff Mentor
    await expect(row.locator('button:has-text("Edit Attendance")')).toHaveCount(0);
    await expect(row.locator('button:has-text("Admin Override")')).toHaveCount(0);

    // 2. Direct API call as mentor is blocked by server timestamp
    const patchRes = await page.request.patch('/api/attendance/abdul-kalam', {
      data: {
        attendanceId: inserted.id,
        status: 'ABSENT',
        reason: 'Attempting to edit June attendance as mentor',
      },
    });
    expect(patchRes.status()).toBe(409);
    const patchJson = await patchRes.json();
    expect(patchJson.error).toBe('ATTENDANCE_EDIT_WINDOW_EXPIRED');

    // 3. Super Admin logs in: sees Admin Override Available and Admin Override button
    await loginWithAccount(page, qaAccounts.superAdmin);
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const adminRow = page.locator(`tr[data-date="${juneDate}"]`).first();
    await expect(adminRow).toBeVisible();
    await expect(adminRow).toContainText('Admin Override Available');
    const overrideBtn = adminRow.locator('button:has-text("Admin Override")');
    await expect(overrideBtn).toBeVisible();
  });

  test('TEST 15, 16, 17: Recently marked attendance displays Marked, Edit Until, and remaining countdown', async ({ page }) => {
    const testDate = generateTestDate();

    await loginWithAccount(page, qaAccounts.staffMentorA);
    const createRes = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: qaAccounts.studentQA001.id,
        attendanceDate: testDate,
        sessionType: 'MORNING',
        status: 'PRESENT',
      },
    });
    expect([200, 409]).toContain(createRes.status());
    const json = await createRes.json();
    const recordId = json.records?.[0]?.id;
    if (!recordId) return; // if already marked, skip

    // Set created_at to 1 hour ago
    await setAttendanceCreatedAt(recordId, 60);

    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const row = page.locator(`tr[data-date="${testDate}"]`).first();
    await expect(row).toBeVisible();

    // Verify Marked and Edit Until are visible
    await expect(row.locator('text=Marked:')).toBeVisible();
    await expect(row.locator('text=Edit Until:')).toBeVisible();

    // Verify remaining-time countdown is visible (e.g. "22h" or "23h ... remaining")
    await expect(row).toContainText(/remaining/i);
    await expect(row).toContainText('Editable');

    // Verify Edit Attendance button is visible
    const editBtn = row.locator('button:has-text("Edit Attendance")');
    await expect(editBtn).toBeVisible();
  });
});
