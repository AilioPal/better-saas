#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { user, account } from '../src/server/db/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function addAccountRecord(userId: string) {
  try {
    // Check if user exists
    const existingUsers = await db.select().from(user).where(eq(user.id, userId));
    if (existingUsers.length === 0) {
      console.log(`❌ User with ID ${userId} does not exist`);
      return;
    }

    // Check if account already exists for this user
    const existingAccounts = await db.select().from(account).where(eq(account.userId, userId));
    if (existingAccounts.length > 0) {
      console.log(`⚠️  Account record already exists for user ${userId}`);
      return;
    }

    // Create a new account record
    const newAccount = {
      id: randomBytes(16).toString('hex'),
      accountId: randomBytes(12).toString('hex'),
      providerId: 'credentials', // Default provider
      userId: userId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(account).values(newAccount);
    console.log(`✅ Created account record for user: ${userId}`);
    console.log(`   Account ID: ${newAccount.accountId}`);
    console.log(`   Provider: ${newAccount.providerId}`);
  } catch (error) {
    console.error('Error creating account record:', error);
  } finally {
    await pool.end();
  }
}

// User ID provided in the request
const userId = '9acb345a7c48f4f5aabfd1b0f362c3db';
addAccountRecord(userId);