import type { TeamRating } from '../ratings/team-ratings';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface DifficultyOptions {
  /** Multiplier applied to opponent strength when playing at home (<1 makes it easier). */
  readonly homeFactor?: number;
  readonly awayFactor?: number;
}

/**
 * Opponent strength index: 1.0 = average team.
 * Good attack (>1) and good defense (<1 conceded ratio) both raise it.
 */
export function opponentStrength(opponent: Pick<TeamRating, 'attack' | 'defense'>): number {
  const defense = Math.max(opponent.defense, 0.05);
  return (opponent.attack + 1 / defense) / 2;
}

const THRESHOLDS: readonly [number, number, number, number] = [0.8, 0.93, 1.07, 1.22];

/** Match difficulty from 1 (very easy) to 5 (very hard) for the team facing `opponent`. */
export function matchDifficulty(
  opponent: Pick<TeamRating, 'attack' | 'defense'>,
  isHome: boolean,
  options: DifficultyOptions = {},
): DifficultyLevel {
  const factor = isHome ? (options.homeFactor ?? 0.95) : (options.awayFactor ?? 1.05);
  const s = opponentStrength(opponent) * factor;
  if (s < THRESHOLDS[0]) return 1;
  if (s < THRESHOLDS[1]) return 2;
  if (s < THRESHOLDS[2]) return 3;
  if (s < THRESHOLDS[3]) return 4;
  return 5;
}
