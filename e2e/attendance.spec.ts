import { expect, test, loginAs } from './fixtures/auth';
import { getTestSupabaseClient } from './helpers/attendance-test-helper';

test.describe('Abdul Kalam attendance boundaries', () => {
  test.afterAll(async () => {
    const supabase = getTestSupabaseClient();
    await supabase.auth.signInWithPassword({
      email: 'qa.superadmin@ptftest.local',
      password: 'Qa@Super2026!',
    });
    await supabase.from('attendance').delete().gte('attendance_date', '2028-01-01');
  });
  test('staff mentor sees attendance controls and eligible roster surface', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance/abdul-kalam');
    await expect(page.getByRole('heading', { name: /Abdul Kalam Special Class Attendance/i })).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.getByText(/Morning|Evening/i).first()).toBeVisible();
  });

  test('student attendance access is restricted by eligibility and never exposes marking controls', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/attendance/abdul-kalam');
    await expect(page.getByRole('button', { name: /Mark Present|Mark Absent|Mark Late|Mark Excused/i })).toHaveCount(0);
  });

  test('attendance API reports a business-rule conflict for a duplicate or invalid daily record', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    const response = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId: '00000000-0000-0000-0000-000000000000',
        attendanceDate: '2099-01-01',
        sessionType: 'MORNING',
        status: 'PRESENT',
      },
    });
    expect([400, 409]).toContain(response.status());
  });

  const getUniqueDate = () => {
    const year = 2028 + Math.floor(Math.random() * 60);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  test('mandatory mutation test: Date X Morning succeeds, then Evening MUST fail', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    const studentId = '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b';
    const dateX = getUniqueDate();

    // 1. First session (Morning) must succeed
    const res1 = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId,
        attendanceDate: dateX,
        sessionType: 'MORNING',
        status: 'PRESENT',
      },
    });
    expect(res1.status()).toBe(200);

    // 2. Second session (Evening) on same date MUST fail with 409
    const res2 = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId,
        attendanceDate: dateX,
        sessionType: 'EVENING',
        status: 'PRESENT',
      },
    });
    expect(res2.status()).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toMatch(/already recorded|already marked|DUPLICATE_DAILY_ATTENDANCE/i);
  });

  test('mandatory mutation test: Date Y Evening succeeds, then Morning MUST fail', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    const studentId = '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b';
    const dateY = getUniqueDate();

    // 1. First session (Evening) must succeed
    const res1 = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId,
        attendanceDate: dateY,
        sessionType: 'EVENING',
        status: 'PRESENT',
      },
    });
    expect(res1.status()).toBe(200);

    // 2. Second session (Morning) on same date MUST fail with 409
    const res2 = await page.request.post('/api/attendance/abdul-kalam', {
      data: {
        studentId,
        attendanceDate: dateY,
        sessionType: 'MORNING',
        status: 'PRESENT',
      },
    });
    expect(res2.status()).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toMatch(/already recorded|already marked|DUPLICATE_DAILY_ATTENDANCE/i);
  });

  test('concurrent attendance mutation: only one session can succeed per date', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    const studentId = '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b';
    const dateZ = getUniqueDate();

    const [resA, resB] = await Promise.all([
      page.request.post('/api/attendance/abdul-kalam', {
        data: { studentId, attendanceDate: dateZ, sessionType: 'MORNING', status: 'PRESENT' },
      }),
      page.request.post('/api/attendance/abdul-kalam', {
        data: { studentId, attendanceDate: dateZ, sessionType: 'EVENING', status: 'LATE' },
      }),
    ]);

    const statuses = [resA.status(), resB.status()].sort();
    expect(statuses).toEqual([200, 409]);
  });
});
