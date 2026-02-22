/**
 * smoke.test.ts — Lightweight production smoke tests for famcal.ai.
 *
 * Runs against https://famcal.ai (or SMOKE_BASE_URL env var).
 * Uses API-seeded test accounts — does NOT write events or touch shared data.
 *
 * Run with: npm run test:smoke
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createSmokeUser, teardownSmokeUsers, SmokeUser } from './helpers/prodSeed';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://famcal.ai';

let browser: Browser;
let page: Page;
let smokeUser: SmokeUser;

beforeAll(async () => {
  smokeUser = await createSmokeUser();
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
});

afterAll(async () => {
  if (browser) await browser.close();
  teardownSmokeUsers();
});

beforeEach(async () => {
  const context = await browser.createBrowserContext();
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
});

afterEach(async () => {
  await page.close();
});

// ─── Test 1: Health endpoint ───────────────────────────────────────────────

test('health endpoint returns 200', async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  expect(res.status).toBe(200);
  const body = await res.json() as Record<string, unknown>;
  expect(body.status).toBe('ok');
});

// ─── Test 2: Login page loads ──────────────────────────────────────────────

test('login page loads with email input', async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  expect(emailInput).not.toBeNull();
});

// ─── Test 3: Login with smoke credentials ─────────────────────────────────

test('login with smoke user succeeds and redirects away from /login', async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

  await page.type('input[type="email"], input[name="email"]', smokeUser.email);
  await page.type('input[type="password"], input[name="password"]', smokeUser.password);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);

  // Give SPA a moment to settle if navigation event didn't fire
  await new Promise((r) => setTimeout(r, 2000));

  expect(page.url()).not.toContain('/login');
});

// ─── Test 4: Calendar view renders ────────────────────────────────────────

test('calendar view renders after login', async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"], input[name="email"]', smokeUser.email);
  await page.type('input[type="password"], input[name="password"]', smokeUser.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);

  const calendar = await page.waitForSelector(
    '.rbc-calendar, [data-testid="calendar"], .calendar-container',
    { timeout: 15000 }
  );
  expect(calendar).not.toBeNull();
});

// ─── Test 5: NLP input is present ─────────────────────────────────────────

test('NLP input field is present on calendar page', async () => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"], input[name="email"]', smokeUser.email);
  await page.type('input[type="password"], input[name="password"]', smokeUser.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);

  // Wait for calendar, then look for NLP input
  await page.waitForSelector(
    '.rbc-calendar, [data-testid="calendar"], .calendar-container',
    { timeout: 15000 }
  );

  const nlpInput = await page.$(
    '[data-testid="nlp-input"], [placeholder*="Add"], [placeholder*="add"], textarea[placeholder]'
  );
  expect(nlpInput).not.toBeNull();
});
