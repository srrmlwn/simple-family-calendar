/**
 * seed.ts — Creates and tears down a known test user in the local dev DB.
 * Uses the same DATABASE_URL as the server's local .env.
 *
 * Test account:
 *   email:    e2e@famcal.test
 *   password: E2eTestPass123!
 */

import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../server/.env') });

export const TEST_USER = {
  email: 'e2e@famcal.test',
  password: 'E2eTestPass123!',
  firstName: 'E2E',
  lastName: 'Test',
};

function getClient(): Client {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set — check server/.env');
  }
  return new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

/** Creates the test user if not present. Returns the user's UUID. */
export async function seedTestUser(): Promise<string> {
  const client = getClient();
  await client.connect();
  try {
    // Check if user already exists
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [TEST_USER.email]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id as string;
    }

    const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [TEST_USER.email, passwordHash, TEST_USER.firstName, TEST_USER.lastName]
    );
    return result.rows[0].id as string;
  } finally {
    await client.end();
  }
}

/** Removes all events for the test user to ensure clean state. */
export async function clearTestUserEvents(userId: string): Promise<void> {
  const client = getClient();
  await client.connect();
  try {
    await client.query('DELETE FROM events WHERE user_id = $1', [userId]);
  } finally {
    await client.end();
  }
}

/** Removes the test user and all their data entirely. */
export async function teardownTestUser(): Promise<void> {
  const client = getClient();
  await client.connect();
  try {
    // CASCADE deletes events, recipients, settings, etc.
    await client.query('DELETE FROM users WHERE email = $1', [TEST_USER.email]);
  } finally {
    await client.end();
  }
}
