import { type DifficultyLevel, matchDifficulty } from '../difficulty/difficulty';
import type { Fixture, Player, PlayerMatchStats } from '../domain/schemas';
import { NEUTRAL_RATING, type TeamRating, computeTeamRatings } from '../ratings/team-ratings';
import { DEFAULT_XPTS_CONFIG, type XPtsConfig } from '../xpts/config';
import { type XPtsResult, expectedPoints } from '../xpts/xpts';

export interface FixtureOutlook {
  readonly fixtureId: string;
  readonly matchday: number;
  readonly kickoff: string;
  readonly opponentTeamId: string;
  readonly isHome: boolean;
  readonly difficulty: DifficultyLevel;
}

export interface PlayerProjection extends XPtsResult {
  /** null when the team has no fixture in the target matchday. */
  readonly fixture: FixtureOutlook | null;
}

export interface ProjectionInput {
  readonly players: readonly Player[];
  readonly fixtures: readonly Fixture[];
  readonly stats: readonly PlayerMatchStats[];
  readonly matchday: number;
  readonly config?: XPtsConfig;
}

function outlookFor(
  teamId: string,
  fixture: Fixture,
  ratings: ReadonlyMap<string, TeamRating>,
): FixtureOutlook {
  const isHome = fixture.homeTeamId === teamId;
  const opponentTeamId = isHome ? fixture.awayTeamId : fixture.homeTeamId;
  const opponent = ratings.get(opponentTeamId) ?? { teamId: opponentTeamId, ...NEUTRAL_RATING };
  return {
    fixtureId: fixture.id,
    matchday: fixture.matchday,
    kickoff: fixture.kickoff,
    opponentTeamId,
    isHome,
    difficulty: matchDifficulty(opponent, isHome),
  };
}

/** Projects every player for `matchday`, using only information available before it. */
export function projectMatchday(input: ProjectionInput): Map<string, PlayerProjection> {
  const ratings = computeTeamRatings(input.fixtures, { beforeMatchday: input.matchday });
  const fixtureByTeam = new Map<string, Fixture>();
  for (const f of input.fixtures) {
    if (f.matchday !== input.matchday) continue;
    fixtureByTeam.set(f.homeTeamId, f);
    fixtureByTeam.set(f.awayTeamId, f);
  }
  const historyByPlayer = new Map<string, PlayerMatchStats[]>();
  for (const s of input.stats) {
    if (s.matchday >= input.matchday) continue;
    const arr = historyByPlayer.get(s.playerId) ?? [];
    arr.push(s);
    historyByPlayer.set(s.playerId, arr);
  }

  const out = new Map<string, PlayerProjection>();
  for (const player of input.players) {
    const fixture = fixtureByTeam.get(player.teamId);
    const outlook = fixture ? outlookFor(player.teamId, fixture, ratings) : null;
    const opponent = outlook
      ? (ratings.get(outlook.opponentTeamId) ?? {
          teamId: outlook.opponentTeamId,
          ...NEUTRAL_RATING,
        })
      : null;
    const result = expectedPoints(
      {
        player,
        history: historyByPlayer.get(player.id) ?? [],
        fixture: outlook && opponent ? { isHome: outlook.isHome, opponent } : null,
      },
      input.config ?? DEFAULT_XPTS_CONFIG,
    );
    out.set(player.id, { ...result, fixture: outlook });
  }
  return out;
}

/** Next `count` fixtures for a team from `fromMatchday` (inclusive), with difficulty. */
export function upcomingFixtures(
  teamId: string,
  fixtures: readonly Fixture[],
  fromMatchday: number,
  count: number,
): FixtureOutlook[] {
  const ratings = computeTeamRatings(fixtures, { beforeMatchday: fromMatchday });
  return fixtures
    .filter(
      (f) => f.matchday >= fromMatchday && (f.homeTeamId === teamId || f.awayTeamId === teamId),
    )
    .sort((a, b) => a.matchday - b.matchday || a.kickoff.localeCompare(b.kickoff))
    .slice(0, count)
    .map((f) => outlookFor(teamId, f, ratings));
}
