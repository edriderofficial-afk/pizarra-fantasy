import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>['db'];

/** Server-side connection (ingest / scripts). Never ship DATABASE_URL to clients. */
export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { max: options.max ?? 5, prepare: false });
  const db = drizzle(sql, { schema });
  return { db, close: () => sql.end() };
}
