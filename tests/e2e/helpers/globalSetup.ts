/**
 * globalSetup.ts — Runs once before the entire E2E test suite.
 * Seeds the test user into the DB and launches the shared browser.
 */

import { launchBrowser } from './browser';
import { seedTestUser } from './seed';

export default async function globalSetup(): Promise<void> {
  console.log('\n[E2E] Seeding test user...');
  await seedTestUser();

  console.log('[E2E] Launching browser...');
  await launchBrowser();

  console.log('[E2E] Setup complete.\n');
}
