#!/usr/bin/env tsx

import { createHash, pbkdf2, randomBytes } from 'crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'util';
import { config } from 'dotenv';

const pbkdf2Async = promisify(pbkdf2);

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

async function setAccountPassword(userId: string, plainPassword: string) {
  try {
    // Check if account exists for this user
    const existingAccounts = await db.select().from(account).where(eq(account.userId, userId));
    if (existingAccounts.length === 0) {
      console.log(`❌ No account record found for user ${userId}`);
      return;
    }

    // Hash the password using PBKDF2
    const salt = randomBytes(16).toString('hex');
    const iterations = 100000;
    const keyLength = 64;
    const hash = await pbkdf2Async(plainPassword, salt, iterations, keyLength, 'sha512');
    const hashedPassword = `pbkdf2:${salt}:${iterations}:${hash.toString('hex')}`;

    // Update the account with the hashed password
    await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(account.userId, userId));

    console.log(`✅ Password set successfully for user: ${userId}`);
    console.log(`   You can now login with the password: ${plainPassword}`);
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    await pool.end();
  }
}

// User ID and password
const userId = '9acb345a7c48f4f5aabfd1b0f362c3db';
const password = process.argv[2] || 'changeme123'; // Default password if none provided

console.log(`Setting password for user ${userId}...`);
setAccountPassword(userId, password);
