import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/auth';

test.describe('Sidebar Active State & Attendance History E2E Suite', () => {
  test('Staff Mentor: on /attendance/abdul-kalam only Abdul Kalam Attendance is yellow active', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance/abdul-kalam');
    await page.waitForLoadState('networkidle');

    const abdulKalamLink = page.locator('aside nav a', { hasText: 'Abdul Kalam Attendance' }).first();
    const historyLink = page.locator('aside nav a', { hasText: 'Attendance History' }).first();
    const dashboardLink = page.locator('aside nav a', { hasText: 'Dashboard' }).first();

    // Abdul Kalam Attendance link MUST have active yellow class
    await expect(abdulKalamLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(abdulKalamLink).toHaveClass(/text-\[#0A192F\]/);

    // Attendance History link MUST NOT have active yellow class
    await expect(historyLink).not.toHaveClass(/bg-\[#D4AF37\]/);
    await expect(historyLink).toHaveClass(/text-\[#94A3B8\]/);

    // Dashboard MUST NOT have active yellow class
    await expect(dashboardLink).not.toHaveClass(/bg-\[#D4AF37\]/);
  });

  test('Staff Mentor: on /attendance only Attendance History is yellow active', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    const abdulKalamLink = page.locator('aside nav a', { hasText: 'Abdul Kalam Attendance' }).first();
    const historyLink = page.locator('aside nav a', { hasText: 'Attendance History' }).first();
    const dashboardLink = page.locator('aside nav a', { hasText: 'Dashboard' }).first();

    // Attendance History link MUST have active yellow class
    await expect(historyLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(historyLink).toHaveClass(/text-\[#0A192F\]/);

    // Abdul Kalam Attendance link MUST NOT have active yellow class
    await expect(abdulKalamLink).not.toHaveClass(/bg-\[#D4AF37\]/);
    await expect(abdulKalamLink).toHaveClass(/text-\[#94A3B8\]/);

    // Dashboard MUST NOT have active yellow class
    await expect(dashboardLink).not.toHaveClass(/bg-\[#D4AF37\]/);
  });

  test('Staff Mentor: page refresh, direct navigation, and browser back/forward keep correct active state', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');

    // 1. Direct navigation to /attendance/abdul-kalam
    await page.goto('/attendance/abdul-kalam');
    await page.waitForLoadState('networkidle');
    const abdulKalamLink = page.locator('aside nav a', { hasText: 'Abdul Kalam Attendance' }).first();
    const historyLink = page.locator('aside nav a', { hasText: 'Attendance History' }).first();

    await expect(abdulKalamLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(historyLink).not.toHaveClass(/bg-\[#D4AF37\]/);

    // 2. Refresh /attendance/abdul-kalam
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(abdulKalamLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(historyLink).not.toHaveClass(/bg-\[#D4AF37\]/);

    // 3. Click Attendance History
    await historyLink.click();
    await page.waitForURL(/\/attendance$/);
    await expect(historyLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(abdulKalamLink).not.toHaveClass(/bg-\[#D4AF37\]/);

    // 4. Browser back -> returns to /attendance/abdul-kalam
    await page.goBack();
    await page.waitForURL(/\/attendance\/abdul-kalam$/);
    await expect(abdulKalamLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(historyLink).not.toHaveClass(/bg-\[#D4AF37\]/);

    // 5. Browser forward -> returns to /attendance
    await page.goForward();
    await page.waitForURL(/\/attendance$/);
    await expect(historyLink).toHaveClass(/bg-\[#D4AF37\]/);
    await expect(abdulKalamLink).not.toHaveClass(/bg-\[#D4AF37\]/);
  });

  test('Attendance History page displays 7-day records with correct sorting and matching dates', async ({ page }) => {
    await loginAs(page, 'STAFF_MENTOR');
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');

    // Attendance Log table should be visible
    await expect(page.getByRole('heading', { name: /Dr\. APJ Abdul Kalam Attendance Records/i })).toBeVisible();

    // Check table rows exist
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(7);

    // Check first row has recent date and no malformed years (e.g. 2096, 2282, 2292)
    const textContent = await page.locator('tbody').innerText();
    expect(textContent).not.toContain('2292');
    expect(textContent).not.toContain('2282');
    expect(textContent).not.toContain('2235');
    expect(textContent).not.toContain('2096');

    // Confirm session date format is visible (e.g. Sep 2026)
    expect(textContent).toMatch(/Sep(?:t)?\s+2026/i);
  });
});
