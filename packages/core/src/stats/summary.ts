import type { PlayerMatchStats } from '../domain/schemas';

export interface PlayerSeasonSummary {
  readonly matchesPlayed: number;
  readonly starts: number;
  readonly totalPoints: number;
  /** Points per match played (minutes > 0). null if never played. */
  readonly averagePoints: number | null;
  /** Points in the latest matchday present in the history (0 if did not play). */
  readonly lastPoints: number | null;
  readonly goals: number;
  readonly assists: number;
  readonly shots: number;
  readonly saves: number;
  readonly clearances: number;
  readonly duelsWon: number;
  readonly possessionsLost: number;
  readonly goalsConceded: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly minutes: number;
}

/** Aggregates a player's match history (any order). */
export function summarizePlayer(history: readonly PlayerMatchStats[]): PlayerSeasonSummary {
  const played = history.filter((h) => h.minutes > 0);
  const sum = (f: (h: PlayerMatchStats) => number) => history.reduce((a, h) => a + f(h), 0);
  const totalPoints = sum((h) => h.points);
  const latest = history.reduce<PlayerMatchStats | null>(
    (best, h) => (best === null || h.matchday > best.matchday ? h : best),
    null,
  );
  return {
    matchesPlayed: played.length,
    starts: history.filter((h) => h.started).length,
    totalPoints,
    averagePoints: played.length > 0 ? totalPoints / played.length : null,
    lastPoints: latest ? latest.points : null,
    goals: sum((h) => h.goals),
    assists: sum((h) => h.assists),
    shots: sum((h) => h.shots),
    saves: sum((h) => h.saves),
    clearances: sum((h) => h.clearances),
    duelsWon: sum((h) => h.duelsWon),
    possessionsLost: sum((h) => h.possessionsLost),
    goalsConceded: sum((h) => h.goalsConceded),
    yellowCards: sum((h) => h.yellowCards),
    redCards: sum((h) => h.redCards),
    minutes: sum((h) => h.minutes),
  };
}
