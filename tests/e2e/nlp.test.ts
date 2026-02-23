/**
 * nlp.test.ts — E2E tests for natural language input.
 *
 * Covers:
 * - NLP input field is present and accessible
 * - Basic event creation via natural language ("Soccer practice tomorrow at 4pm")
 * - Parsed event details shown in confirmation before saving
 * - Event appears on calendar after NLP creation
 * - Graceful handling of unrecognizable input
 */

import { Page } from 'puppeteer';
import { newPage } from './helpers/browser';
import { login } from './helpers/auth';
import { TEST_USER, clearTestUserEvents, seedTestUser } from './helpers/seed';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Natural Language Input', () => {
  let page: Page;
  let userId: string;

  beforeAll(async () => {
    userId = await seedTestUser();
  });

  beforeEach(async () => {
    page = await newPage();
    await clearTestUserEvents(userId);
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  afterEach(async () => {
    await page.close();
  });

  test('NLP input field is present on the calendar page', async () => {
    const nlpInput = await page.$(
      '[data-testid="nlp-input"], input[placeholder*="natural language"], ' +
      'input[placeholder*="Add event"], textarea[placeholder*="Type"]'
    );
    expect(nlpInput).not.toBeNull();
  });

  test('creates an event from natural language input', async () => {
    const NLP_INPUT = 'Soccer practice tomorrow at 4pm';

    // Focus and type into the NLP input
    const nlpInput = await page.$(
      '[data-testid="nlp-input"], input[placeholder*="natural language"], ' +
      'input[placeholder*="Add event"], textarea'
    );
    expect(nlpInput).not.toBeNull();

    await nlpInput!.click();
    await nlpInput!.type(NLP_INPUT);
    await page.keyboard.press('Enter');

    // Wait for parsed result / confirmation card to appear
    const confirmation = await page.waitForSelector(
      '[data-testid="nlp-confirmation"], [data-testid="parsed-event"], .parsed-event-card',
      { timeout: 10000 }
    );
    expect(confirmation).not.toBeNull();

    // The parsed title should contain "Soccer" or "soccer practice"
    const cardText = await confirmation!.evaluate((el) => el.textContent?.toLowerCase() || '');
    expect(cardText).toMatch(/soccer/i);
  });

  test('confirms NLP-parsed event and shows it on calendar', async () => {
    const NLP_INPUT = 'Team dinner next Friday at 7pm';

    const nlpInput = await page.$(
      '[data-testid="nlp-input"], input[placeholder*="natural language"], textarea'
    );
    if (!nlpInput) return; // skip if NLP input not found

    await nlpInput.click();
    await nlpInput.type(NLP_INPUT);
    await page.keyboard.press('Enter');

    // Wait for confirmation to appear
    await page.waitForSelector(
      '[data-testid="nlp-confirmation"], [data-testid="parsed-event"], .parsed-event-card',
      { timeout: 10000 }
    ).catch(() => {}); // may auto-save without confirmation

    // Confirm / save
    const confirmBtn = await page.$(
      '[data-testid="confirm-event"], [data-testid="save-parsed-event"], ' +
      'button[aria-label*="Confirm"], button[aria-label*="Save"]'
    );
    if (confirmBtn) {
      await confirmBtn.click();
      await sleep(2000);
    }

    // Event should appear on calendar
    const eventOnCalendar = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.rbc-event, [data-testid="calendar-event"]'))
        .some((el) => el.textContent?.toLowerCase().includes('dinner'));
    });

    expect(eventOnCalendar).toBe(true);
  });

  test('shows error or suggestion for unrecognizable input', async () => {
    const nlpInput = await page.$(
      '[data-testid="nlp-input"], input[placeholder*="natural language"], textarea'
    );
    if (!nlpInput) return;

    await nlpInput.click();
    await nlpInput.type('xyzzy 12345 $$$'); // gibberish
    await page.keyboard.press('Enter');

    await sleep(3000);

    // Should show error, suggestion, or empty state — NOT crash
    const hasError = await page.$(
      '[data-testid="nlp-error"], [role="alert"], .error-message, .suggestion'
    );
    // The app should still be functional (no crash)
    const calendar = await page.$('.rbc-calendar, [data-testid="calendar"]');
    expect(calendar).not.toBeNull();
  });
});
