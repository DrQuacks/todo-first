import 'dotenv/config';
import { Pool } from 'pg';
import { resetDbForTests , closeDb } from '../src/db';

beforeEach(async () => { await resetDbForTests(); });

afterAll(async () => {
    await closeDb();
  });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const result = await pool.query('SELECT NOW() as now;');
    console.log('Connected! Current time from DB:', result.rows[0].now);
  } catch (err) {
    console.error('DB connection error:', err);
  } finally {
    await pool.end();
  }
}

main();
