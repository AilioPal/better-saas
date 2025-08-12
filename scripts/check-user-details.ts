#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function checkUserDetails(userId: string) {
  try {
    // Get user details
    const users = await db.select().from(user).where(eq(user.id, userId));
    
    if (users.length === 0) {
      console.log(`❌ No user found with ID: ${userId}`);
      return;
    }

    const userRecord = users[0];
    console.log('\n📧 User Details:');
    console.log(`   ID: ${userRecord.id}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Name: ${userRecord.name}`);
    console.log(`   Role: ${userRecord.role}`);
    console.log(`   Email Verified: ${userRecord.emailVerified}`);

    // Get account details
    const accounts = await db.select().from(account).where(eq(account.userId, userId));
    
    if (accounts.length > 0) {
      console.log('\n🔐 Account Details:');
      accounts.forEach((acc, index) => {
        console.log(`   Account ${index + 1}:`);
        console.log(`     ID: ${acc.id}`);
        console.log(`     Account ID: ${acc.accountId}`);
        console.log(`     Provider: ${acc.providerId}`);
        console.log(`     Has Password: ${acc.password ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('\n⚠️  No account records found for this user');
    }

    // Also check what user has the email admin@example.com
    console.log('\n🔍 Checking for admin@example.com...');
    const adminUsers = await db.select().from(user).where(eq(user.email, 'admin@example.com'));
    
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0];
      console.log(`   Found user with email admin@example.com:`);
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Name: ${adminUser.name}`);
      
      // Check if this user has an account
      const adminAccounts = await db.select().from(account).where(eq(account.userId, adminUser.id));
      console.log(`   Has account record: ${adminAccounts.length > 0 ? 'Yes' : 'No'}`);
    } else {
      console.log('   No user found with email admin@example.com');
    }

  } catch (error) {
    console.error('Error checking user details:', error);
  } finally {
    await pool.end();
  }
}

const userId = '9acb345a7c48f4f5aabfd1b0f362c3db';
checkUserDetails(userId);