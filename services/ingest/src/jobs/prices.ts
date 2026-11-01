import { schema } from '@pizarra/db';
import { sql } from 'drizzle-orm';
import { chunk, type IngestContext } from '../context';

/**
 * Daily price snapshot: one row per player and day (the provider's "today").
 * Re-running the same day overwrites with the latest value (idempotent).
 */
export async function snapshotPrices(ctx: IngestContext): Promise<number> {
  const [players, state] = await Promise.all([
    ctx.provider.getPlayers(ctx.competition),
    ctx.provider.getSeasonState(ctx.competition),
  ]);
  const date = state.now.slice(0, 10);
  for (const batch of chunk(players)) {
    await ctx.db
      .insert(schema.playerPriceDaily)
      .values(batch.map((p) => ({ playerId: p.id, date, price: p.price })))
      .onConflictDoUpdate({
        target: [schema.playerPriceDaily.playerId, schema.playerPriceDaily.date],
        set: { price: sql`excluded.price` },
      });
  }
  return players.length;
}
