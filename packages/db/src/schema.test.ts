import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as schema from './schema';
import { migrationFiles } from './testing';

const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable));

describe('schema', () => {
  it('has RLS enabled on every table', () => {
    expect(tables.length).toBeGreaterThanOrEqual(15);
    for (const t of tables) {
      expect(getTableConfig(t).enableRLS, getTableConfig(t).name).toBe(true);
    }
  });

  it('never stores LALIGA credentials or tokens', () => {
    for (const t of tables) {
      for (const c of getTableConfig(t).columns) {
        expect(c.name, `${getTableConfig(t).name}.${c.name}`).not.toMatch(
          /password|access_token|refresh_token|laliga_token|credential/i,
        );
      }
    }
  });

  it('migrations exist in order', () => {
    expect(migrationFiles()[0]).toMatch(/^0000_/);
  });
});
