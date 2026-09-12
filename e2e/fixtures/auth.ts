import { expect, test as base, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

export type Role = 'SUPER_ADMIN' | 'SEMI_ADMIN' | 'PTF_SECRETARY' | 'STAFF_MENTOR' | 'STUDENT';

export type Account = {
  role: Role;
  login: string;
  password: string;
};

const configuredAccounts: Record<Role, Account | undefined> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    login: process.env.PTF_SUPER_ADMIN_LOGIN || 'demo@ptffoundation.org',
    password: process.env.PTF_SUPER_ADMIN_PASSWORD || 'Demo@2026',
  },
  SEMI_ADMIN: {
    role: 'SEMI_ADMIN',
    login: process.env.PTF_SEMI_ADMIN_LOGIN || 'semi.admin@ptffoundation.org',
    password: process.env.PTF_SEMI_ADMIN_PASSWORD || 'SemiAdmin@2026',
  },
  PTF_SECRETARY: {
    role: 'PTF_SECRETARY',
    login: process.env.PTF_SECRETARY_LOGIN || 'secretary@ptffoundation.org',
    password: process.env.PTF_SECRETARY_PASSWORD || 'Secretary@2026',
  },
  STAFF_MENTOR: {
    role: 'STAFF_MENTOR',
    login: process.env.PTF_STAFF_LOGIN || 'staff.mentor@ptffoundation.org',
    password: process.env.PTF_STAFF_PASSWORD || 'Staff@2026',
  },
  STUDENT: {
    role: 'STUDENT',
    login: process.env.PTF_STUDENT_LOGIN || 'student.demo@ptffoundation.org',
    password: process.env.PTF_STUDENT_PASSWORD || 'Student@2026',
  },
};

export const studentBAccount: Account = {
  role: 'STUDENT',
  login: process.env.PTF_STUDENT_B_LOGIN || 'student.two@ptffoundation.org',
  password: process.env.PTF_STUDENT_B_PASSWORD || 'Student@2026',
};

export const staffTwoAccount: Account = {
  role: 'STAFF_MENTOR',
  login: process.env.PTF_STAFF_TWO_LOGIN || 'staff.two@ptffoundation.org',
  password: process.env.PTF_STAFF_TWO_PASSWORD || 'Staff@2026',
};

export const qaAccounts = {
  superAdmin: {
    role: 'SUPER_ADMIN' as Role,
    login: 'qa.superadmin@ptftest.local',
    password: 'Qa@Super2026!',
    id: '11111111-1111-4111-a111-111111111111',
  },
  semiAdmin: {
    role: 'SEMI_ADMIN' as Role,
    login: 'qa.semiadmin@ptftest.local',
    password: 'Qa@Semi2026!',
    id: '22222222-2222-4222-a222-222222222222',
  },
  secretary: {
    role: 'PTF_SECRETARY' as Role,
    login: 'qa.secretary@ptftest.local',
    password: 'Qa@Secretary2026!',
    id: '33333333-3333-4333-a333-333333333333',
  },
  staffMentorA: {
    role: 'STAFF_MENTOR' as Role,
    login: 'qa.staffmentor@ptftest.local',
    password: 'Qa@Staff2026!',
    id: '44444444-4444-4444-a444-444444444444',
  },
  staffMentorB: {
    role: 'STAFF_MENTOR' as Role,
    login: 'qa.staffmentor2@ptftest.local',
    password: 'Qa@Staff2026!',
    id: '55555555-5555-4555-a555-555555555555',
  },
  studentQA001: {
    role: 'STUDENT' as Role,
    login: 'qa.student.eligible@ptftest.local',
    password: 'Qa@Student2026!',
    ptfId: 'QA001',
    id: 'a6666666-6666-4666-a666-666666666666',
  },
  studentQA002: {
    role: 'STUDENT' as Role,
    login: 'qa.student.ineligible@ptftest.local',
    password: 'Qa@Student2026!',
    ptfId: 'QA002',
    id: 'a7777777-7777-4777-a777-777777777777',
  },
};

export function accountFor(role: Role): Account | undefined {
  return configuredAccounts[role];
}

export async function loginWithCredentials(page: Page, role: Role) {
  const account = accountFor(role);
  test.skip(!account, `No credentials configured for ${role}`);

  await page.goto('/login');
  await page.getByLabel('Login ID / Email').fill(account!.login);
  await page.locator('#login-password').fill(account!.password);
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

export async function loginWithAccount(page: Page, account: Account) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => window.localStorage.clear());
  } catch {}
  await page.goto('/login');
  const loginInput = page.locator('#login-id');
  const passwordInput = page.locator('#login-password');
  await expect(loginInput).toBeVisible();
  await page.waitForTimeout(300);
  await loginInput.fill(account.login);
  await passwordInput.fill(account.password);

  // If late hydration cleared the inputs, refill them
  if ((await loginInput.inputValue()) !== account.login) {
    await page.waitForTimeout(300);
    await loginInput.fill(account.login);
    await passwordInput.fill(account.password);
  }

  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 25_000 });
}

export async function loginAsStaffTwo(page: Page) {
  await loginWithAccount(page, staffTwoAccount);
}


export async function loginAs(page: Page, role: Role) {
  const account = accountFor(role);
  test.skip(!account, `No credentials configured for ${role}`);

  // Clear previous session state to prevent role cross-contamination
  await page.context().clearCookies();
  try {
    await page.evaluate(() => window.localStorage.clear());
  } catch {}

  const projectName = test.info().project.name;
  const statePath = path.resolve(__dirname, '..', 'playwright', '.auth', projectName, `${role}.json`);
  let state: { cookies?: Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }>; origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }> } | null = null;
  try {
    state = JSON.parse(await fs.readFile(statePath, 'utf8'));
  } catch {
    state = null;
  }

  if (state) {
    await page.context().addCookies(state.cookies || []);
    await page.goto('/login');
    const originState = state.origins?.find((origin: { origin: string }) => origin.origin === new URL(page.url()).origin);
    if (originState?.localStorage) {
      await page.evaluate((entries: Array<{ name: string; value: string }>) => {
        window.localStorage.clear();
        for (const entry of entries) window.localStorage.setItem(entry.name, entry.value);
      }, originState.localStorage);
    }
    await page.reload();
    await page.goto('/dashboard');
  } else {
    await page.goto('/login');
    await page.locator('#login-id').fill(account!.login);
    await page.locator('#login-password').fill(account!.password);
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  }
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => window.localStorage.clear());
  } catch {}
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
}

export async function loginAsStudentB(page: Page) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => window.localStorage.clear());
  } catch {}

  await page.goto('/login');
  await page.locator('#login-id').fill(studentBAccount.login);
  await page.locator('#login-password').fill(studentBAccount.password);
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
}

export const test = base;
export { expect };
