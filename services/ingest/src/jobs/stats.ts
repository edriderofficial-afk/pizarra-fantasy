import { schema } from '@pizarra/db';
import { sql } from 'drizzle-orm';
import { chunk, type IngestContext } from '../context';

const STAT_COLUMNS = [
  'started',
  'minutes',
  'points',
  'goals',
  'assists',
  'shots',
  'saves',
  'clearances',
  'duels_won',
  'possessions_lost',
  'goals_conceded',
  'yellow_cards',
  'red_cards',
] as const;

/** Upserts per-match player stats (official points can be revised after a matchday). */
export async function syncMatchStats(ctx: IngestContext): Promise<number> {
  const stats = await ctx.provider.getMatchStats(ctx.competition);
  const set = Object.fromEntries(
    STAT_COLUMNS.map((c) => [
      c.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()),
      sql.raw(`excluded.${c}`),
    ]),
  );
  for (const batch of chunk(stats)) {
    await ctx.db
      .insert(schema.playerMatchStats)
      .values(batch)
      .onConflictDoUpdate({
        target: [schema.playerMatchStats.playerId, schema.playerMatchStats.fixtureId],
        set,
      });
  }
  return stats.length;
}
