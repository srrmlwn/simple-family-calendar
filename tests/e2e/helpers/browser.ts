/**
 * browser.ts — Shared Puppeteer browser/page management.
 * Each test suite calls newPage() to get a fresh context.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

let browser: Browser | null = null;

export async function launchBrowser(): Promise<void> {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/** Returns a fresh page with a clean context (no shared cookies/storage). */
export async function newPage(): Promise<Page> {
  if (!browser) throw new Error('Browser not launched — call launchBrowser() first');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  return page;
}

export { BASE_URL };
