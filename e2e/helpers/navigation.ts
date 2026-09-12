import { expect, Page } from '@playwright/test';

export async function expectRedirectedTo(page: Page, path: string, target: RegExp) {
  await page.goto(path);
  await expect(page).toHaveURL(target);
}

export async function expectRouteVisible(page: Page, path: string, heading: RegExp | string) {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
}
