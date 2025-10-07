import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from './db';

export const db = drizzle(pool);
