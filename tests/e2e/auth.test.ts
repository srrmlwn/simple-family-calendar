/**
 * auth.test.ts — E2E tests for authentication flows.
 *
 * Covers:
 * - Email/password login (success + failure)
 * - Session persistence on page reload
 * - Logout
 * - Redirect to login when unauthenticated
 */

import { Page } from 'puppeteer';
import { newPage, BASE_URL } from './helpers/browser';
import { login, logout } from './helpers/auth';
import { TEST_USER } from './helpers/seed';

describe('Authentication', () => {
  let page: Page;

  beforeEach(async () => {
    page = await newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  test('redirects unauthenticated user to login', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    expect(page.url()).toContain('/login');
  });

  test('rejects invalid credentials', async () => {
    const result = await login(page, 'nobody@famcal.test', 'wrongpassword');
    expect(result.success).toBe(false);
  });

  test('logs in with valid credentials and shows calendar', async () => {
    const result = await login(page, TEST_USER.email, TEST_USER.password);
    expect(result.success).toBe(true);
    expect(page.url()).not.toContain('/login');
  });

  test('session persists after page reload', async () => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.reload({ waitUntil: 'networkidle0' });

    // Should still see calendar, not login page
    const url = page.url();
    expect(url).not.toContain('/login');

    const calendar = await page.$('.rbc-calendar, [data-testid="calendar"], .calendar-container');
    expect(calendar).not.toBeNull();
  });

  test('logout clears session and redirects to login', async () => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await logout(page);
    expect(page.url()).toContain('/login');
  });
});
