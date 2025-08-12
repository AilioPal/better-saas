#!/usr/bin/env tsx

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env') });

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { user } from '../src/server/db/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function checkUsers() {
  try {
    const users = await db.select().from(user).limit(10);
    console.log(`Total users found: ${users.length}`);
    users.forEach((u) => {
      console.log(`- ${u.email} (role: ${u.role})`);
    });
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
