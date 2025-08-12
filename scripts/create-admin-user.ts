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
import { user } from '../src/server/db/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function createAdminUser(email: string) {
  try {
    // Check if user already exists
    const existingUsers = await db.select().from(user).where(eq(user.email, email));
    if (existingUsers.length > 0) {
      console.log(`User ${email} already exists`);
      return;
    }

    // Create a new admin user
    const newUser = {
      id: randomBytes(16).toString('hex'),
      email: email,
      emailVerified: false,
      name: 'Admin User',
      role: 'admin' as const,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(user).values(newUser);
    console.log(`✅ Created admin user: ${email}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

const email = process.argv[2] || 'admin@example.com';
createAdminUser(email);