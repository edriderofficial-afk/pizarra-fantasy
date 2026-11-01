import type { Fixture } from '../domain/schemas';
import { ewma, shrink } from '../stats/ewma';

/**
 * Relative team strength from recent results.
 * attack  = goals scored per match / league average (>1 = scores more than average)
 * defense = goals conceded per match / league average (>1 = concedes more than average, i.e. weaker)
 */
export interface TeamRating {
  readonly teamId: string;
  readonly attack: number;
  readonly defense: number;
  readonly matches: number;
}

export interface TeamRatingOptions {
  /** Only fixtures with matchday < beforeMatchday are used (avoid leakage). */
  readonly beforeMatchday: number;
  readonly halfLife?: number;
  /** Pseudo-matches pulling ratings toward 1.0 (average). */
  readonly priorMatches?: number;
}

export function computeTeamRatings(
  fixtures: readonly Fixture[],
  options: TeamRatingOptions,
): Map<string, TeamRating> {
  const halfLife = options.halfLife ?? 4;
  const k = options.priorMatches ?? 3;
  const finished = fixtures
    .filter(
      (f) =>
        f.status === 'finished' &&
        f.matchday < options.beforeMatchday &&
        f.homeGoals !== null &&
        f.awayGoals !== null,
    )
    .sort((a, b) => a.matchday - b.matchday);

  const scored = new Map<string, number[]>();
  const conceded = new Map<string, number[]>();
  const push = (m: Map<string, number[]>, id: string, v: number) => {
    const arr = m.get(id) ?? [];
    arr.push(v);
    m.set(id, arr);
  };
  let goals = 0;
  for (const f of finished) {
    const hg = f.homeGoals as number;
    const ag = f.awayGoals as number;
    push(scored, f.homeTeamId, hg);
    push(conceded, f.homeTeamId, ag);
    push(scored, f.awayTeamId, ag);
    push(conceded, f.awayTeamId, hg);
    goals += hg + ag;
  }
  const leagueAvg = finished.length > 0 ? goals / (2 * finished.length) : 1;
  const safeAvg = leagueAvg > 0 ? leagueAvg : 1;

  const teamIds = new Set<string>();
  for (const f of fixtures) {
    teamIds.add(f.homeTeamId);
    teamIds.add(f.awayTeamId);
  }
  const out = new Map<string, TeamRating>();
  for (const id of teamIds) {
    const s = scored.get(id) ?? [];
    const c = conceded.get(id) ?? [];
    const att = ewma(s, halfLife);
    const def = ewma(c, halfLife);
    out.set(id, {
      teamId: id,
      attack: shrink(att === null ? null : att / safeAvg, s.length, 1, k),
      defense: shrink(def === null ? null : def / safeAvg, c.length, 1, k),
      matches: s.length,
    });
  }
  return out;
}

export const NEUTRAL_RATING: Omit<TeamRating, 'teamId'> = { attack: 1, defense: 1, matches: 0 };
