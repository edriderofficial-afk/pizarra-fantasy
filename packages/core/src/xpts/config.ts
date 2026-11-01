import type { PlayerStatus, Position } from '../domain/schemas';

/** Tunable parameters of xPts v1. Kept as data so backtesting can sweep them. */
export interface XPtsConfig {
  readonly formHalfLife: number;
  readonly availabilityHalfLife: number;
  /** Pseudo-observations used to shrink small samples toward priors. */
  readonly shrinkMatches: number;
  readonly priorPointsIfStart: Readonly<Record<Position, number>>;
  readonly priorPointsIfSub: number;
  readonly priorStartProbability: number;
  readonly priorAppearanceProbability: number;
  readonly priorStdDev: number;
  readonly subStdDev: number;
  /** How strongly opponent ratings move expectations (0 = ignore opponent). */
  readonly opponentElasticity: number;
  /** Share of a position's points that depends on attacking output (rest: defensive). */
  readonly attackingShare: Readonly<Record<Position, number>>;
  readonly homeMultiplier: number;
  readonly awayMultiplier: number;
  readonly setPieceBonus: {
    readonly penalties: number;
    readonly freeKicks: number;
    readonly corners: number;
  };
  readonly statusFactor: Readonly<Record<PlayerStatus, number>>;
  /** Minimum minutes-weight for a start (short starts still count a bit). */
  readonly minMinutesWeight: number;
}

export const DEFAULT_XPTS_CONFIG: XPtsConfig = {
  formHalfLife: 3,
  availabilityHalfLife: 3,
  shrinkMatches: 3,
  priorPointsIfStart: { GK: 3.5, DEF: 3.2, MID: 3.4, FWD: 3.6 },
  priorPointsIfSub: 1.2,
  priorStartProbability: 0.5,
  priorAppearanceProbability: 0.7,
  priorStdDev: 3.5,
  subStdDev: 2,
  opponentElasticity: 0.35,
  attackingShare: { GK: 0, DEF: 0.2, MID: 0.6, FWD: 0.9 },
  homeMultiplier: 1.06,
  awayMultiplier: 0.94,
  setPieceBonus: { penalties: 0.5, freeKicks: 0.2, corners: 0.1 },
  statusFactor: { available: 1, doubtful: 0.5, injured: 0, suspended: 0 },
  minMinutesWeight: 0.3,
};
