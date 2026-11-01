import type { Player, PlayerMatchStats } from '../domain/schemas';
import { MODEL_VERSION } from '../model-version';
import type { TeamRating } from '../ratings/team-ratings';
import { clamp, ewma, shrink, stdDev } from '../stats/ewma';
import { DEFAULT_XPTS_CONFIG, type XPtsConfig } from './config';

export type XPtsReasonCode =
  | 'form'
  | 'startProbability'
  | 'opponent'
  | 'venue'
  | 'setPieces'
  | 'status'
  | 'lowSample'
  | 'noFixture';

/**
 * A quantified reason behind an estimate. `impact` is the contribution in expected points
 * relative to a neutral baseline (average opponent, neutral venue, position prior).
 */
export interface XPtsReason {
  readonly code: XPtsReasonCode;
  readonly value: number;
  readonly impact: number;
}

export interface FixtureContext {
  readonly isHome: boolean;
  readonly opponent: Pick<TeamRating, 'attack' | 'defense'>;
}

export interface XPtsInput {
  readonly player: Pick<Player, 'id' | 'position' | 'status' | 'setPieces'>;
  /** Matches strictly before the target matchday, any order. */
  readonly history: readonly PlayerMatchStats[];
  /** null = the team has no match this matchday. */
  readonly fixture: FixtureContext | null;
}

export interface XPtsResult {
  readonly playerId: string;
  readonly modelVersion: string;
  readonly xPts: number;
  /** 10th / 90th percentile (normal approximation of the start/sub mixture). */
  readonly p10: number;
  readonly p90: number;
  readonly pStart: number;
  readonly pSub: number;
  readonly expectedIfStart: number;
  readonly expectedIfSub: number;
  /** Sorted by absolute impact, most important first. */
  readonly reasons: readonly XPtsReason[];
}

const Z90 = 1.2816;

/**
 * xPts v1 = P(start) · E[pts | start] + P(sub with minutes) · E[pts | sub].
 * Form: minutes-weighted EWMA shrunk toward a positional prior; adjusted by opponent ratings,
 * venue and set-piece duties. Pure and deterministic.
 */
export function expectedPoints(
  input: XPtsInput,
  config: XPtsConfig = DEFAULT_XPTS_CONFIG,
): XPtsResult {
  const { player, fixture } = input;
  if (fixture === null) {
    return {
      playerId: player.id,
      modelVersion: MODEL_VERSION,
      xPts: 0,
      p10: 0,
      p90: 0,
      pStart: 0,
      pSub: 0,
      expectedIfStart: 0,
      expectedIfSub: 0,
      reasons: [{ code: 'noFixture', value: 0, impact: 0 }],
    };
  }

  const history = [...input.history].sort((a, b) => a.matchday - b.matchday);
  const k = config.shrinkMatches;
  const starts = history.filter((h) => h.started);
  const subs = history.filter((h) => !h.started && h.minutes > 0);

  // Availability
  const startRate = ewma(
    history.map((h) => (h.started ? 1 : 0)),
    config.availabilityHalfLife,
  );
  const appearRate = ewma(
    history.map((h) => (h.minutes > 0 ? 1 : 0)),
    config.availabilityHalfLife,
  );
  const pStartRaw = shrink(startRate, history.length, config.priorStartProbability, k);
  const pAppearRaw = shrink(appearRate, history.length, config.priorAppearanceProbability, k);
  const statusFactor = config.statusFactor[player.status];
  const pStart = clamp(pStartRaw * statusFactor, 0, 1);
  const pSub = clamp(Math.max(0, pAppearRaw - pStartRaw) * statusFactor, 0, 1 - pStart);

  // Form (minutes-weighted)
  const prior = config.priorPointsIfStart[player.position];
  const startPoints = starts.map((h) => h.points);
  const minuteWeights = starts.map((h) => clamp(h.minutes / 90, config.minMinutesWeight, 1));
  const formStart = shrink(
    ewma(startPoints, config.formHalfLife, minuteWeights),
    starts.length,
    prior,
    k,
  );
  const formSub = shrink(
    ewma(
      subs.map((h) => h.points),
      config.formHalfLife,
    ),
    subs.length,
    config.priorPointsIfSub,
    k,
  );

  // Context multipliers
  const e = config.opponentElasticity;
  const share = config.attackingShare[player.position];
  const attackingMult = Math.max(fixture.opponent.defense, 0.05) ** e;
  const defensiveMult = (1 / Math.max(fixture.opponent.attack, 0.05)) ** e;
  const opponentMult = share * attackingMult + (1 - share) * defensiveMult;
  const venueMult = fixture.isHome ? config.homeMultiplier : config.awayMultiplier;
  const sp = config.setPieceBonus;
  const setPieceBonus =
    (player.setPieces.penalties ? sp.penalties : 0) +
    (player.setPieces.freeKicks ? sp.freeKicks : 0) +
    (player.setPieces.corners ? sp.corners : 0);

  const expectedIfStart = formStart * opponentMult * venueMult + setPieceBonus;
  const expectedIfSub = formSub * opponentMult * venueMult;
  const xPts = pStart * expectedIfStart + pSub * expectedIfSub;

  // Uncertainty: variance of the start / sub / no-play mixture
  const sdStart = shrink(stdDev(startPoints), starts.length, config.priorStdDev, k);
  const secondMoment =
    pStart * (sdStart ** 2 + expectedIfStart ** 2) +
    pSub * (config.subStdDev ** 2 + expectedIfSub ** 2);
  const sd = Math.sqrt(Math.max(0, secondMoment - xPts ** 2));

  const reasons: XPtsReason[] = [
    { code: 'form', value: formStart, impact: pStart * (formStart - prior) },
    {
      code: 'startProbability',
      value: pStart,
      impact: (Math.min(pStartRaw, 1) - 1) * expectedIfStart,
    },
    { code: 'opponent', value: opponentMult, impact: pStart * formStart * (opponentMult - 1) },
    {
      code: 'venue',
      value: venueMult,
      impact: pStart * formStart * opponentMult * (venueMult - 1),
    },
  ];
  if (setPieceBonus > 0)
    reasons.push({ code: 'setPieces', value: setPieceBonus, impact: pStart * setPieceBonus });
  if (statusFactor < 1) {
    reasons.push({
      code: 'status',
      value: statusFactor,
      impact: -(1 - statusFactor) * pStartRaw * expectedIfStart,
    });
  }
  if (starts.length < k) reasons.push({ code: 'lowSample', value: starts.length, impact: 0 });
  reasons.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    playerId: player.id,
    modelVersion: MODEL_VERSION,
    xPts,
    p10: xPts - Z90 * sd,
    p90: xPts + Z90 * sd,
    pStart,
    pSub,
    expectedIfStart,
    expectedIfSub,
    reasons,
  };
}
