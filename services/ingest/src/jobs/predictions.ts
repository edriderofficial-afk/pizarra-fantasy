import { MODEL_VERSION, projectMatchday } from '@pizarra/core';
import { schema } from '@pizarra/db';
import { and, eq, sql } from 'drizzle-orm';
import { chunk, type IngestContext } from '../context';

/**
 * Stores xPts predictions for the next matchday (versioned by MODEL_VERSION) and scores
 * stored predictions of already-played matchdays against actual points (accuracy panel).
 */
export async function syncPredictions(ctx: IngestContext): Promise<number> {
  const [players, fixtures, stats, state] = await Promise.all([
    ctx.provider.getPlayers(ctx.competition),
    ctx.provider.getFixtures(ctx.competition),
    ctx.provider.getMatchStats(ctx.competition),
    ctx.provider.getSeasonState(ctx.competition),
  ]);
  const projections = projectMatchday({ players, fixtures, stats, matchday: state.nextMatchday });
  const rows = [...projections.values()]
    .filter((p) => p.fixture !== null)
    .map((p) => ({
      playerId: p.playerId,
      season: ctx.season,
      matchday: state.nextMatchday,
      modelVersion: p.modelVersion,
      xPts: p.xPts,
      p10: p.p10,
      p90: p.p90,
      pStart: p.pStart,
      pSub: p.pSub,
      reasons: p.reasons.map((r) => ({ code: r.code, value: r.value, impact: r.impact })),
    }));
  for (const batch of chunk(rows)) {
    await ctx.db
      .insert(schema.predictions)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          schema.predictions.playerId,
          schema.predictions.season,
          schema.predictions.matchday,
          schema.predictions.modelVersion,
        ],
        set: {
          xPts: sql`excluded.x_pts`,
          p10: sql`excluded.p10`,
          p90: sql`excluded.p90`,
          pStart: sql`excluded.p_start`,
          pSub: sql`excluded.p_sub`,
          reasons: sql`excluded.reasons`,
        },
      });
  }
  return rows.length + (await scorePredictions(ctx, state.lastPlayedMatchday, stats));
}

async function scorePredictions(
  ctx: IngestContext,
  lastPlayed: number,
  stats: Awaited<ReturnType<IngestContext['provider']['getMatchStats']>>,
): Promise<number> {
  const actual = new Map(stats.map((s) => [`${s.playerId}:${s.matchday}`, s.points]));
  const stored = await ctx.db
    .select()
    .from(schema.predictions)
    .where(
      and(
        eq(schema.predictions.season, ctx.season),
        sql`${schema.predictions.matchday} <= ${lastPlayed}`,
      ),
    );
  const results = stored.flatMap((p) => {
    const points = actual.get(`${p.playerId}:${p.matchday}`);
    if (points === undefined) return [];
    return [
      {
        playerId: p.playerId,
        season: p.season,
        matchday: p.matchday,
        modelVersion: p.modelVersion,
        predicted: p.xPts,
        actual: points,
        absError: Math.abs(points - p.xPts),
        insidePredictionInterval: points >= p.p10 && points <= p.p90,
      },
    ];
  });
  for (const batch of chunk(results)) {
    await ctx.db.insert(schema.predictionResults).values(batch).onConflictDoNothing();
  }
  return results.length;
}

export { MODEL_VERSION };
