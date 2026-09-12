import { chromium, FullConfig } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { accountFor, Role } from './fixtures/auth';

const roles: Role[] = ['SUPER_ADMIN', 'SEMI_ADMIN', 'PTF_SECRETARY', 'STAFF_MENTOR', 'STUDENT'];

export default async function globalSetup(config: FullConfig) {
  for (const project of config.projects) {
    const baseURL = project.use.baseURL || 'http://localhost:3000';
    const stateDir = path.resolve(config.rootDir, 'playwright', '.auth', project.name);
    await fs.mkdir(stateDir, { recursive: true });
    const browser = await chromium.launch();
    try {
      for (const role of roles) {
        const account = accountFor(role);
        if (!account) continue;

        const context = await browser.newContext({ baseURL });
        const page = await context.newPage();
        await page.goto('/login');
        await page.locator('#login-id').fill(account.login);
        await page.locator('#login-password').fill(account.password);
        await page.getByRole('button', { name: 'Sign In to Portal' }).click();
        await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 30_000 });
        await context.storageState({ path: path.join(stateDir, `${role}.json`) });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
}
