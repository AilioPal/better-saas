import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '.env' });

export default {
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/better-saas',
  },
  tablesFilter: ['better-saas_*'],
} satisfies Config;
