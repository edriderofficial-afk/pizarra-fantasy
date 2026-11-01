import { schema } from '@pizarra/db';
import { sql } from 'drizzle-orm';
import { chunk, type IngestContext } from '../context';

export async function syncFixtures(ctx: IngestContext): Promise<number> {
  const fixtures = await ctx.provider.getFixtures(ctx.competition);
  for (const batch of chunk(fixtures)) {
    await ctx.db
      .insert(schema.fixtures)
      .values(
        batch.map((f) => ({
          id: f.id,
          competitionId: f.competition,
          season: ctx.season,
          matchday: f.matchday,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId,
          kickoff: new Date(f.kickoff),
          status: f.status,
          homeGoals: f.homeGoals,
          awayGoals: f.awayGoals,
        })),
      )
      .onConflictDoUpdate({
        target: schema.fixtures.id,
        set: {
          kickoff: sql`excluded.kickoff`,
          status: sql`excluded.status`,
          homeGoals: sql`excluded.home_goals`,
          awayGoals: sql`excluded.away_goals`,
          updatedAt: sql`now()`,
        },
      });
  }
  return fixtures.length;
}
