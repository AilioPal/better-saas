import { env } from '@/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// 使用标准 PostgreSQL 连接，支持本地开发
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

export default db;

export * from './repositories';