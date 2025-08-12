#!/usr/bin/env tsx

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { account } from '../src/server/db/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function fixAccountProvider(userId: string) {
  try {
    // Update the provider to 'credential' (singular) which is what better-auth expects
    await db
      .update(account)
      .set({
        providerId: 'credential',
        updatedAt: new Date(),
      })
      .where(eq(account.userId, userId));

    console.log(`✅ Updated provider to 'credential' for user: ${userId}`);

    // Verify the update
    const accounts = await db.select().from(account).where(eq(account.userId, userId));
    if (accounts.length > 0) {
      console.log(`   Provider is now: ${accounts[0].providerId}`);
    }
  } catch (error) {
    console.error('Error updating provider:', error);
  } finally {
    await pool.end();
  }
}

const userId = '9acb345a7c48f4f5aabfd1b0f362c3db';
fixAccountProvider(userId);
