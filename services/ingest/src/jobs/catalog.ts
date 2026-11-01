import { schema } from '@pizarra/db';
import { sql } from 'drizzle-orm';
import { chunk, type IngestContext } from '../context';

/** Upserts teams and players (current price, status, set pieces). */
export async function syncCatalog(ctx: IngestContext): Promise<number> {
  const [teams, players] = await Promise.all([
    ctx.provider.getTeams(ctx.competition),
    ctx.provider.getPlayers(ctx.competition),
  ]);
  for (const batch of chunk(teams)) {
    await ctx.db
      .insert(schema.teams)
      .values(
        batch.map((t) => ({
          id: t.id,
          competitionId: t.competition,
          name: t.name,
          shortName: t.shortName,
        })),
      )
      .onConflictDoUpdate({
        target: schema.teams.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          updatedAt: sql`now()`,
        },
      });
  }
  for (const batch of chunk(players)) {
    await ctx.db
      .insert(schema.players)
      .values(
        batch.map((p) => ({
          id: p.id,
          teamId: p.teamId,
          competitionId: p.competition,
          name: p.name,
          position: p.position,
          status: p.status,
          setPieces: p.setPieces,
          price: p.price,
        })),
      )
      .onConflictDoUpdate({
        target: schema.players.id,
        set: {
          teamId: sql`excluded.team_id`,
          name: sql`excluded.name`,
          position: sql`excluded.position`,
          status: sql`excluded.status`,
          setPieces: sql`excluded.set_pieces`,
          price: sql`excluded.price`,
          updatedAt: sql`now()`,
        },
      });
  }
  return teams.length + players.length;
}
