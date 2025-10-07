import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function resetDbForTests() {
  await pool.query('TRUNCATE TABLE todos RESTART IDENTITY;');
}

export async function closeDb() {
    await pool.end();
  }