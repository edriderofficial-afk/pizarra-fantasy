/**
 * Usage: pnpm --filter @pizarra/ingest ingest <job|all> [--competition primera|hypermotion]
 * Env: DATABASE_URL (server only), INGEST_PROVIDER=mock (fantasy-public arrives in Phase 2B).
 */
import { CompetitionIdSchema, currentSeasonRules } from '@pizarra/core';
import { createMockProvider, type DataProvider } from '@pizarra/data';
import { createDb } from '@pizarra/db';
import { ALL_JOBS, isJobName, type JobName, runJob } from './run';

function providerFromEnv(): DataProvider {
  const kind = process.env.INGEST_PROVIDER ?? 'mock';
  if (kind === 'mock') return createMockProvider();
  throw new Error(`INGEST_PROVIDER=${kind} is not available yet (Phase 2B, needs HAR)`);
}

async function main() {
  const [jobArg = 'all', ...rest] = process.argv.slice(2);
  const compIdx = rest.indexOf('--competition');
  const competitions =
    compIdx >= 0 ? [CompetitionIdSchema.parse(rest[compIdx + 1])] : currentSeasonRules.competitions;
  const jobs: JobName[] = jobArg === 'all' ? [...ALL_JOBS] : isJobName(jobArg) ? [jobArg] : [];
  if (jobs.length === 0)
    throw new Error(`Unknown job "${jobArg}". Use: all | ${ALL_JOBS.join(' | ')}`);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const { db, close } = createDb(url);
  const provider = providerFromEnv();
  try {
    for (const competition of competitions) {
      for (const job of jobs) {
        const rows = await runJob(
          { db, provider, competition, season: currentSeasonRules.season },
          job,
        );
        console.log(`[ingest] ${job}:${competition} -> ${rows} rows`);
      }
    }
  } finally {
    await close();
  }
}

main().catch((e: unknown) => {
  console.error('[ingest] failed:', e);
  process.exitCode = 1;
});
