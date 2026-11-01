import { createMockProvider } from '@pizarra/data';
import { createTestDatabase, type TestDatabase } from '@pizarra/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { IngestContext } from './context';
import { chunk } from './context';
import { ALL_JOBS, isJobName, runJob } from './run';

const BASE = process.env.TEST_DATABASE_URL;

describe('chunk / job names', () => {
  it('chunks rows', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('validates job names', () => {
    expect(isJobName('prices')).toBe(true);
    expect(isJobName('nope')).toBe(false);
  });
});

describe.skipIf(!BASE)('ingest jobs (real Postgres, mock provider)', () => {
  let t: TestDatabase;
  let ctx: IngestContext;

  beforeAll(async () => {
    t = await createTestDatabase(BASE as string);
    ctx = { db: t.db, provider: createMockProvider(), competition: 'primera', season: '2026-27' };
  });
  afterAll(async () => {
    await t?.drop();
  });

  const count = async (table: string) =>
    Number((await t.admin.unsafe(`SELECT count(*)::int AS n FROM ${table}`))[0]?.n);

  it('runs every job and records ingest_runs', async () => {
    for (const job of ALL_JOBS) await runJob(ctx, job);
    expect(await count('teams')).toBe(20);
    expect(await count('players')).toBe(360);
    expect(await count('fixtures')).toBeGreaterThan(0);
    expect(await count('player_match_stats')).toBe(3600);
    expect(await count('player_price_daily')).toBe(360);
    expect(await count('predictions')).toBeGreaterThan(300);
    const runs = await t.admin`SELECT status FROM ingest_runs`;
    expect(runs.every((r) => r.status === 'ok')).toBe(true);
  });

  it('is idempotent', async () => {
    const before = await Promise.all(
      ['players', 'player_price_daily', 'player_match_stats', 'predictions'].map(count),
    );
    for (const job of ALL_JOBS) await runJob(ctx, job);
    const after = await Promise.all(
      ['players', 'player_price_daily', 'player_match_stats', 'predictions'].map(count),
    );
    expect(after).toEqual(before);
  });

  it('scores stored predictions once the matchday is played', async () => {
    const [pred] = await t.admin`SELECT player_id, season, matchday FROM predictions LIMIT 1`;
    await t.admin`INSERT INTO predictions (player_id, season, matchday, model_version, x_pts, p10, p90, p_start, p_sub, reasons)
                  VALUES (${pred?.player_id}, '2026-27', 10, 'test', 4, 0, 8, 0.9, 0, '[]')`;
    await runJob(ctx, 'predictions');
    const [result] =
      await t.admin`SELECT predicted, actual, abs_error FROM prediction_results WHERE model_version = 'test'`;
    expect(result?.predicted).toBe(4);
    expect(Number(result?.abs_error)).toBeCloseTo(Math.abs(Number(result?.actual) - 4));
  });

  it('records failures', async () => {
    const failing: IngestContext = {
      ...ctx,
      provider: { ...ctx.provider, getPlayers: () => Promise.reject(new Error('boom')) },
    };
    await expect(runJob(failing, 'prices')).rejects.toThrow('boom');
    const [run] =
      await t.admin`SELECT status, error FROM ingest_runs ORDER BY started_at DESC LIMIT 1`;
    expect(run?.status).toBe('error');
    expect(run?.error).toContain('boom');
  });

  it('handles the hypermotion competition', async () => {
    const hctx: IngestContext = { ...ctx, competition: 'hypermotion' };
    await runJob(hctx, 'catalog');
    await runJob(hctx, 'prices');
    const [row] =
      await t.admin`SELECT count(*)::int AS n FROM players WHERE competition_id = 'hypermotion'`;
    expect(row?.n).toBe(72);
  });
});
