/**
 * prodSeed.ts — Creates and destroys a smoke-test user against the production API.
 *
 * Does NOT touch the DB directly (no DATABASE_URL needed).
 * Uses the public /api/auth/register and /api/auth/login endpoints.
 *
 * Teardown runs `heroku pg:psql` to delete by email pattern so it works
 * even if the test user's token has expired.
 */

import { execFileSync } from 'child_process';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://kinroo.ai';
const HEROKU_APP = process.env.HEROKU_APP || 'simple-family-calendar-8282627220c3';

export interface SmokeUser {
  email: string;
  password: string;
  /** Cookie string returned by the login response, ready to pass as Cookie header */
  cookie: string;
}

/**
 * Creates a uniquely-named smoke test user via the production API.
 * Returns credentials + the session cookie from the login response.
 */
export async function createSmokeUser(): Promise<SmokeUser> {
  const timestamp = Date.now();
  const email = `smoke-${timestamp}@kinroo-test.invalid`;
  const password = `Smoke${timestamp}!`;

  // Register
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Smoke', lastName: 'Test' }),
  });
  if (!registerRes.ok) {
    const body = await registerRes.text();
    throw new Error(`Smoke user registration failed (${registerRes.status}): ${body}`);
  }

  // Login to get session cookie
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.text();
    throw new Error(`Smoke user login failed (${loginRes.status}): ${body}`);
  }

  // Extract the Set-Cookie header (JWT is HTTP-only cookie)
  const setCookieHeader = loginRes.headers.get('set-cookie') || '';
  // Keep only the cookie name=value part (strip directives like Path, HttpOnly, etc.)
  const cookie = setCookieHeader.split(';')[0].trim();

  return { email, password, cookie };
}

/**
 * Deletes all smoke test accounts from the production DB.
 * Uses the Heroku CLI — requires `heroku` to be authenticated.
 */
export function teardownSmokeUsers(): void {
  try {
    execFileSync('heroku', [
      'pg:psql',
      '--app', HEROKU_APP,
      '-c', "DELETE FROM users WHERE email LIKE 'smoke-%@kinroo-test.invalid'",
    ], { stdio: 'pipe' });
  } catch (err) {
    // Non-fatal: log and continue so test teardown doesn't mask actual failures
    console.warn('prodSeed teardown warning:', err instanceof Error ? err.message : err);
  }
}
