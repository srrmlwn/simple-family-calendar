/**
 * auth.ts — Login/logout helpers for E2E tests.
 * Uses email/password auth (not Google OAuth, which can't be automated).
 */

import { Page } from 'puppeteer';
import { BASE_URL } from './browser';

export interface LoginResult {
  success: boolean;
  error?: string;
}

/**
 * Logs in via the email/password form and waits for the calendar to load.
 */
export async function login(page: Page, email: string, password: string): Promise<LoginResult> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

  // Wait for the login form
  await page.waitForSelector('input[type="email"], input[name="email"]');

  // Fill credentials
  await page.type('input[type="email"], input[name="email"]', email);
  await page.type('input[type="password"], input[name="password"]', password);

  // Submit
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 })
      .catch(() => {}), // navigation may not fire if app uses SPA routing
    page.keyboard.press('Enter'),
  ]);

  // Check for error message
  const errorEl = await page.$('[data-testid="login-error"], .error-message, [role="alert"]');
  if (errorEl) {
    const errorText = await errorEl.evaluate((el) => el.textContent || '');
    return { success: false, error: errorText.trim() };
  }

  // Wait for calendar to be visible — indicates successful login
  try {
    await page.waitForSelector('[data-testid="calendar"], .rbc-calendar, .calendar-container', {
      timeout: 10000,
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Calendar did not load after login' };
  }
}

/**
 * Logs out and waits for redirect to login page.
 */
export async function logout(page: Page): Promise<void> {
  // Try clicking a logout button if present
  const logoutBtn = await page.$(
    '[data-testid="logout"], button[aria-label="Logout"], a[href="/logout"]'
  );
  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  } else {
    // Clear localStorage and navigate to login as fallback
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  }
}
