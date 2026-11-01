import { schema } from '@pizarra/db';
import { eq } from 'drizzle-orm';
import type { IngestContext } from './context';
import { syncCatalog } from './jobs/catalog';
import { syncFixtures } from './jobs/fixtures';
import { syncPredictions } from './jobs/predictions';
import { snapshotPrices } from './jobs/prices';
import { syncMatchStats } from './jobs/stats';

export const JOBS = {
  catalog: syncCatalog,
  fixtures: syncFixtures,
  stats: syncMatchStats,
  prices: snapshotPrices,
  predictions: syncPredictions,
} as const;
export type JobName = keyof typeof JOBS;
/** Dependency order: catalog before anything referencing players/teams. */
export const ALL_JOBS: readonly JobName[] = [
  'catalog',
  'fixtures',
  'stats',
  'prices',
  'predictions',
];

export function isJobName(name: string): name is JobName {
  return name in JOBS;
}

/** Runs a job and records it in ingest_runs (running -> ok | error). Rethrows on failure. */
export async function runJob(ctx: IngestContext, name: JobName): Promise<number> {
  const [run] = await ctx.db
    .insert(schema.ingestRuns)
    .values({ job: `${name}:${ctx.competition}`, status: 'running' })
    .returning({ id: schema.ingestRuns.id });
  const id = run?.id as string;
  try {
    const rows = await JOBS[name](ctx);
    await ctx.db
      .update(schema.ingestRuns)
      .set({ status: 'ok', rows, finishedAt: new Date() })
      .where(eq(schema.ingestRuns.id, id));
    return rows;
  } catch (error) {
    await ctx.db
      .update(schema.ingestRuns)
      .set({ status: 'error', error: String(error).slice(0, 2000), finishedAt: new Date() })
      .where(eq(schema.ingestRuns.id, id));
    throw error;
  }
}
