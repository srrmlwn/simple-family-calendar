/**
 * onboarding.test.ts — E2E tests for the new user onboarding flow.
 *
 * Steps:
 *   0 — Welcome
 *   1 — Family Members
 *   2 — Notifications
 *   3 — Email Recipients
 *   4 — Try It (NLP demo)
 *
 * Covers:
 * - Onboarding overlay shown on first login
 * - Skipping the entire flow via the X button
 * - Skipping from the Welcome screen
 * - Walking through all 5 steps with Continue/Skip
 * - Adding a family member in Step 1 and verifying it persists
 * - Adding a recipient in Step 3 and verifying it persists
 * - NLP demo in Step 4 creates a real event
 * - Overlay absent on subsequent logins (onboarding already complete)
 * - localStorage step resume (refresh mid-flow)
 */

import { Page } from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('pg');
import * as dotenv from 'dotenv';
import * as path from 'path';
import { newPage } from './helpers/browser';
import { login } from './helpers/auth';
import { TEST_USER, seedTestUser, resetOnboarding, clearTestUserEvents } from './helpers/seed';

dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginFresh(page: Page) {
  return login(page, TEST_USER.email, TEST_USER.password);
}

async function waitForOverlay(page: Page, timeout = 8000) {
  await page.waitForSelector('[data-testid="onboarding-overlay"]', { timeout });
}

async function overlayVisible(page: Page): Promise<boolean> {
  const el = await page.$('[data-testid="onboarding-overlay"]');
  return el !== null;
}

async function clickContinue(page: Page) {
  await page.click('[data-testid="onboarding-continue"]');
  await sleep(300);
}

async function clickSkipStep(page: Page) {
  await page.click('[data-testid="onboarding-skip-step"]');
  await sleep(300);
}

/** Read an element's textContent without using eval-based APIs. */
async function getText(page: Page, selector: string): Promise<string> {
  const el = await page.$(selector);
  if (!el) return '';
  const prop = await el.getProperty('textContent');
  return ((await prop.jsonValue()) as string) ?? '';
}

/** Wait until an element's text includes the given substring. */
async function waitForText(page: Page, selector: string, substring: string, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const text = await getText(page, selector);
    if (text.toLowerCase().includes(substring.toLowerCase())) return;
    await sleep(200);
  }
  throw new Error(`Timed out waiting for "${substring}" in ${selector}`);
}

/** Poll until the onboarding overlay is no longer in the DOM. */
async function waitForOverlayGone(page: Page, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const el = await page.$('[data-testid="onboarding-overlay"]');
    if (!el) return;
    await sleep(150);
  }
  throw new Error('Timed out waiting for onboarding overlay to disappear');
}

async function markOnboardingComplete(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false }) as any;
  await client.connect();
  await client.query(
    'UPDATE user_settings SET onboarding_completed = true WHERE user_id = $1',
    [userId]
  );
  await client.end();
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('Onboarding flow', () => {
  let page: Page;
  let userId: string;

  beforeAll(async () => {
    userId = await seedTestUser();
  });

  beforeEach(async () => {
    page = await newPage();
    await resetOnboarding(userId);
  });

  afterEach(async () => {
    await page.close();
  });

  // ── 1. Overlay appears on first login ──────────────────────────────────────

  test('shows onboarding overlay when onboarding_completed is false', async () => {
    const result = await loginFresh(page);
    expect(result.success).toBe(true);

    await waitForOverlay(page);
    expect(await overlayVisible(page)).toBe(true);

    const step0 = await page.$('[data-testid="onboarding-step-0"]');
    expect(step0).not.toBeNull();
  });

  // ── 2. X button dismisses overlay and persists completion ─────────────────

  test('X button dismisses overlay and marks onboarding complete', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    await page.click('[data-testid="onboarding-close"]');

    await waitForOverlayGone(page);

    // Reload — overlay must not reappear
    await page.reload({ waitUntil: 'networkidle0' });
    expect(await overlayVisible(page)).toBe(false);
  });

  // ── 3. "Skip setup" on Welcome dismisses overlay ──────────────────────────

  test('"Skip setup" on welcome step dismisses overlay', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    await page.click('[data-testid="onboarding-skip-all"]');

    await waitForOverlayGone(page);

    expect(await overlayVisible(page)).toBe(false);
  });

  // ── 4. Step dots advance correctly ────────────────────────────────────────

  test('step dots update as user progresses through steps', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    // Dot 0 should be active at step 0
    const dot0 = await page.$('[data-testid="onboarding-dot-0"][data-active="true"]');
    expect(dot0).not.toBeNull();

    // Advance to step 1 (Family Members)
    await page.click('[data-testid="onboarding-start"]');
    await page.waitForSelector('[data-testid="onboarding-step-1"]', { timeout: 3000 });
    const dot1 = await page.$('[data-testid="onboarding-dot-1"][data-active="true"]');
    expect(dot1).not.toBeNull();

    // Advance to step 2 (Notifications)
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-2"]', { timeout: 3000 });
    const dot2 = await page.$('[data-testid="onboarding-dot-2"][data-active="true"]');
    expect(dot2).not.toBeNull();
  });

  // ── 5. Full happy path: walk all 5 steps ──────────────────────────────────

  test('walking all steps with Continue/Skip completes onboarding', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    // Step 0 → 1 (Family Members)
    await page.click('[data-testid="onboarding-start"]');
    await page.waitForSelector('[data-testid="onboarding-step-1"]');

    // Step 1 → 2 (Notifications) — skip family members
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-2"]');

    // Step 2 → 3 (Recipients) — continue through notifications
    await clickContinue(page);
    await page.waitForSelector('[data-testid="onboarding-step-3"]');

    // Step 3 → 4 (Try It) — skip recipients
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-4"]');

    // Finish
    await page.click('[data-testid="onboarding-finish"]');

    await waitForOverlayGone(page);

    await page.reload({ waitUntil: 'networkidle0' });
    expect(await overlayVisible(page)).toBe(false);
  });

  // ── 6. Step 1: family member added shows in the confirmed list ─────────────

  test('family member added in step 1 appears in the confirmed list', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    await page.click('[data-testid="onboarding-start"]');
    await page.waitForSelector('[data-testid="onboarding-step-1"]');

    await page.type('[data-testid="onboarding-member-name"]', 'Alex Test');
    await page.click('[data-testid="onboarding-member-add"]');

    await page.waitForSelector('[data-testid="onboarding-members-list"]', { timeout: 5000 });
    await waitForText(page, '[data-testid="onboarding-members-list"]', 'Alex Test');
  });

  // ── 7. Step 3: recipient added shows in the confirmed list ────────────────

  test('recipient added in step 3 appears in the confirmed list', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    await page.click('[data-testid="onboarding-start"]');
    await page.waitForSelector('[data-testid="onboarding-step-1"]');
    await clickSkipStep(page); // skip family members
    await page.waitForSelector('[data-testid="onboarding-step-2"]');
    await clickContinue(page); // through notifications
    await page.waitForSelector('[data-testid="onboarding-step-3"]');

    await page.type('[data-testid="onboarding-recipient-name"]', 'Sarah Test');
    await page.type('[data-testid="onboarding-recipient-email"]', 'sarah@kinroo.test');
    await page.click('[data-testid="onboarding-recipient-add"]');

    await page.waitForSelector('[data-testid="onboarding-recipients-list"]', { timeout: 5000 });
    await waitForText(page, '[data-testid="onboarding-recipients-list"]', 'Sarah Test');
  });

  // ── 8. Step 4: NLP demo creates a real event ──────────────────────────────

  test('NLP input in step 4 creates an event and shows success', async () => {
    await clearTestUserEvents(userId);
    await loginFresh(page);
    await waitForOverlay(page);

    await page.click('[data-testid="onboarding-start"]');
    await page.waitForSelector('[data-testid="onboarding-step-1"]');
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-2"]');
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-3"]');
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-4"]');

    // Replace pre-filled text with a test command
    await page.click('[data-testid="onboarding-nlp-input"]', { clickCount: 3 });
    await page.type('[data-testid="onboarding-nlp-input"]', 'Add team lunch on Friday at noon');

    await page.click('[data-testid="onboarding-nlp-send"]');

    // NLP + DB round-trip — allow up to 15s
    await page.waitForSelector('[data-testid="onboarding-nlp-success"]', { timeout: 15000 });

    const successText = await getText(page, '[data-testid="onboarding-nlp-success"]');
    expect(successText.toLowerCase()).toContain('event');
  });

  // ── 9. Returning user does NOT see overlay ────────────────────────────────

  test('returning user with onboarding already done sees no overlay', async () => {
    await markOnboardingComplete(userId);

    await loginFresh(page);
    await sleep(2000);

    expect(await overlayVisible(page)).toBe(false);
  });

  // ── 10. localStorage resume: refresh mid-flow lands on same step ───────────

  test('refreshing mid-flow resumes at the same step', async () => {
    await loginFresh(page);
    await waitForOverlay(page);

    // Advance to step 2 (Notifications)
    await page.click('[data-testid="onboarding-start"]');
    await page.waitForSelector('[data-testid="onboarding-step-1"]');
    await clickSkipStep(page);
    await page.waitForSelector('[data-testid="onboarding-step-2"]');

    // Reload without clearing localStorage
    await page.reload({ waitUntil: 'networkidle0' });
    await waitForOverlay(page);

    // Must resume at step 2
    const step2 = await page.$('[data-testid="onboarding-step-2"]');
    expect(step2).not.toBeNull();
  });

  // ── 11. DayView empty state shows NLP hint ────────────────────────────────

  test('empty calendar day shows NLP hint text after onboarding completes', async () => {
    await clearTestUserEvents(userId);
    await loginFresh(page);
    await waitForOverlay(page);

    await page.click('[data-testid="onboarding-close"]');
    await waitForOverlayGone(page);

    await page.waitForSelector('[data-testid="day-view"]', { timeout: 5000 });

    const dayViewText = await getText(page, '[data-testid="day-view"]');
    expect(dayViewText).not.toContain('No events scheduled for this day');
    expect(dayViewText.toLowerCase()).toContain('try');
  });
});
