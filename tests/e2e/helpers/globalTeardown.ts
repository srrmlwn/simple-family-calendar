/**
 * globalTeardown.ts — Runs once after the entire E2E test suite.
 * Closes the browser and removes the test user.
 */

import { closeBrowser } from './browser';
import { teardownTestUser } from './seed';

export default async function globalTeardown(): Promise<void> {
  console.log('\n[E2E] Closing browser...');
  await closeBrowser();

  console.log('[E2E] Removing test user...');
  await teardownTestUser();

  console.log('[E2E] Teardown complete.\n');
}
