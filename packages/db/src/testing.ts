/**
 * Test harness: creates a throwaway database that mimics what Supabase provides
 * (roles anon/authenticated/service_role, auth.users, auth.uid(), default grants),
 * applies supabase/migrations in order and returns helpers to act as a given role.
 * Requires TEST_DATABASE_URL (superuser connection to an existing database).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations',
);

const SUPABASE_SHIM = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
  SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$f$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export interface TestDatabase {
  readonly url: string;
  /** Superuser connection (bypasses RLS). */
  readonly admin: postgres.Sql;
  readonly db: ReturnType<typeof drizzle<typeof schema>>;
  /** Run `fn` inside a transaction as `role`, optionally with a JWT subject. Rolled back. */
  as<T>(
    role: 'anon' | 'authenticated' | 'service_role',
    sub: string | null,
    fn: (tx: postgres.TransactionSql) => Promise<T>,
  ): Promise<T>;
  drop(): Promise<void>;
}

class Rollback extends Error {
  constructor(readonly value: unknown) {
    super('rollback');
  }
}

export async function createTestDatabase(baseUrl: string): Promise<TestDatabase> {
  const name = `pizarra_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const root = postgres(baseUrl, { max: 1, onnotice: () => undefined });
  await root.unsafe(`CREATE DATABASE ${name}`);
  await root.end();

  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  const admin = postgres(url.toString(), { max: 4, onnotice: () => undefined, prepare: false });
  await admin.unsafe(SUPABASE_SHIM);
  for (const file of migrationFiles()) {
    const sqlText = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sqlText.split('--> statement-breakpoint')) {
      if (statement.trim()) await admin.unsafe(statement);
    }
  }

  return {
    url: url.toString(),
    admin,
    db: drizzle(admin, { schema }),
    async as(role, sub, fn) {
      try {
        await admin.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE ${role}`);
          if (sub)
            await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub, role })}, true)`;
          throw new Rollback(await fn(tx));
        });
      } catch (e) {
        if (e instanceof Rollback) return e.value as never;
        throw e;
      }
      throw new Error('unreachable');
    },
    async drop() {
      await admin.end();
      const r = postgres(baseUrl, { max: 1, onnotice: () => undefined });
      await r.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await r.end();
    },
  };
}
