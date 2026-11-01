import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from './testing';

const BASE = process.env.TEST_DATABASE_URL;
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe.skipIf(!BASE)('RLS policies (real Postgres)', () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase(BASE as string);
    const a = t.admin;
    await a`INSERT INTO auth.users (id) VALUES (${A}), (${B})`;
    await a`INSERT INTO users (id) VALUES (${A}), (${B})`;
    await a`INSERT INTO teams (id, competition_id, name, short_name) VALUES ('t1', 'primera', 'Equipo', 'EQU')`;
    await a`INSERT INTO players (id, team_id, competition_id, name, position, status, set_pieces, price)
            VALUES ('p1', 't1', 'primera', 'Jugador', 'MID', 'available', '{"penalties":false,"freeKicks":false,"corners":false}', 1000000)`;
    await a`INSERT INTO follows (user_id, player_id) VALUES (${B}, 'p1')`;
    await a`INSERT INTO entitlements (user_id, entitlement, active, source) VALUES (${A}, 'premium', true, 'test'), (${B}, 'premium', false, 'test')`;
    await a`INSERT INTO ingest_runs (job, status) VALUES ('prices', 'ok')`;
  });

  afterAll(async () => {
    await t?.drop();
  });

  it('applies the seed migration', async () => {
    const rows = await t.admin`SELECT id FROM competitions ORDER BY id`;
    expect(rows.map((r) => r.id)).toEqual(['hypermotion', 'primera']);
    const [flag] =
      await t.admin`SELECT value FROM remote_config WHERE key = 'fantasy_provider_enabled'`;
    expect(flag?.value).toBe(false);
  });

  it('anon can read game data but not write it', async () => {
    const players = await t.as('anon', null, (tx) => tx`SELECT id FROM players`);
    expect(players).toHaveLength(1);
    await expect(
      t.as('anon', null, (tx) => tx`UPDATE players SET price = 1 WHERE id = 'p1' RETURNING id`),
    ).resolves.toHaveLength(0);
    await expect(
      t.as('anon', null, (tx) => tx`INSERT INTO competitions (id, name) VALUES ('x', 'x')`),
    ).rejects.toThrow(/row-level security/);
  });

  it('anon cannot see user data', async () => {
    expect(await t.as('anon', null, (tx) => tx`SELECT * FROM follows`)).toHaveLength(0);
    expect(await t.as('anon', null, (tx) => tx`SELECT * FROM users`)).toHaveLength(0);
  });

  it('users only see and change their own rows', async () => {
    expect(await t.as('authenticated', A, (tx) => tx`SELECT * FROM follows`)).toHaveLength(0);
    expect(await t.as('authenticated', B, (tx) => tx`SELECT * FROM follows`)).toHaveLength(1);
    const own = await t.as(
      'authenticated',
      A,
      (tx) => tx`INSERT INTO follows (user_id, player_id) VALUES (${A}, 'p1') RETURNING user_id`,
    );
    expect(own).toHaveLength(1);
    await expect(
      t.as(
        'authenticated',
        A,
        (tx) => tx`INSERT INTO follows (user_id, player_id) VALUES (${B}, 'p1')`,
      ),
    ).rejects.toThrow(/row-level security/);
    const deleted = await t.as(
      'authenticated',
      A,
      (tx) => tx`DELETE FROM follows WHERE user_id = ${B} RETURNING 1`,
    );
    expect(deleted).toHaveLength(0);
    const users = await t.as('authenticated', A, (tx) => tx`SELECT id FROM users`);
    expect(users.map((u) => u.id)).toEqual([A]);
  });

  it('users cannot move their rows to another user', async () => {
    await expect(
      t.as('authenticated', B, (tx) => tx`UPDATE follows SET user_id = ${A} WHERE user_id = ${B}`),
    ).rejects.toThrow(/row-level security/);
  });

  it('entitlements are read-only for their owner', async () => {
    const rows = await t.as('authenticated', A, (tx) => tx`SELECT user_id FROM entitlements`);
    expect(rows.map((r) => r.user_id)).toEqual([A]);
    await expect(
      t.as(
        'authenticated',
        A,
        (tx) =>
          tx`INSERT INTO entitlements (user_id, entitlement, active, source) VALUES (${A}, 'x', true, 'me')`,
      ),
    ).rejects.toThrow(/row-level security/);
    const updated = await t.as(
      'authenticated',
      A,
      (tx) => tx`UPDATE entitlements SET active = true RETURNING 1`,
    );
    expect(updated).toHaveLength(0);
  });

  it('ingest_runs is invisible to clients and writable by service_role', async () => {
    expect(await t.as('authenticated', A, (tx) => tx`SELECT * FROM ingest_runs`)).toHaveLength(0);
    expect(await t.as('anon', null, (tx) => tx`SELECT * FROM ingest_runs`)).toHaveLength(0);
    const inserted = await t.as(
      'service_role',
      null,
      (
        tx,
      ) => tx`INSERT INTO players (id, team_id, competition_id, name, position, status, set_pieces, price)
      VALUES ('p2', 't1', 'primera', 'Otro', 'FWD', 'available', '{"penalties":false,"freeKicks":false,"corners":false}', 1) RETURNING id`,
    );
    expect(inserted).toHaveLength(1);
  });
});
