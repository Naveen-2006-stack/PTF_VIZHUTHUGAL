import { expect, test, loginAs } from './fixtures/auth';
import { expectRedirectedTo } from './helpers/navigation';

const roleCases = [
  {
    role: 'SUPER_ADMIN' as const,
    visible: ['Students & Import', 'Staff & Mentors', 'Staff Mapping', 'Kalam Eligibility', 'Audit Logs', 'Settings'],
    blocked: [] as string[],
  },
  {
    role: 'STAFF_MENTOR' as const,
    visible: ['Abdul Kalam Attendance', 'Attendance History'],
    blocked: ['/academics/ct-marks', '/leave-permission', '/admin/students', '/settings'],
  },
  {
    role: 'STUDENT' as const,
    visible: ['My Profile', 'Academics & CT', 'Scholarship Renewal', 'Leave & Permission', 'Notifications'],
    blocked: ['/admin/students', '/staff-mapping', '/settings'],
  },
  {
    role: 'SEMI_ADMIN' as const,
    visible: ['Students', 'Academics & CT', 'Leave & Permission', 'Reports'],
    blocked: ['/settings', '/admin/campuses', '/admin/audit-logs'],
  },
  {
    role: 'PTF_SECRETARY' as const,
    visible: ['Students Overview', 'Academic Summary', 'Leave/Permission', 'Reports'],
    blocked: ['/settings', '/admin/campuses', '/admin/audit-logs'],
  },
];

test.describe('role navigation and direct-route authorization', () => {
  for (const roleCase of roleCases) {
    test(`${roleCase.role} sees intended navigation and is blocked from restricted routes`, async ({ page }) => {
      await loginAs(page, roleCase.role);
      if ((await page.evaluate(() => window.innerWidth)) >= 1024) {
        for (const label of roleCase.visible) {
          await expect(page.getByRole('link', { name: label, exact: true }).first()).toBeVisible();
        }
      } else {
        await expect(page.getByRole('banner')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
      }
      for (const path of roleCase.blocked) {
        await expectRedirectedTo(
          page,
          path,
          roleCase.role === 'STAFF_MENTOR' ? /\/attendance\/abdul-kalam$/ : /\/dashboard(?:\?.*)?$/,
        );
      }
    });
  }
});
