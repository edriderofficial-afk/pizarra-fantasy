import { describe, expect, it } from 'vitest';
import type { Position } from '../domain/schemas';
import { type LineupCandidate, evaluateLineup, optimizeLineup } from './lineup';

const c = (id: string, position: Position, xPts: number, available = true): LineupCandidate => ({
  playerId: id,
  position,
  xPts,
  available,
});

const squad: LineupCandidate[] = [
  c('gk1', 'GK', 4),
  c('gk2', 'GK', 2),
  c('d1', 'DEF', 5),
  c('d2', 'DEF', 4),
  c('d3', 'DEF', 3),
  c('d4', 'DEF', 1),
  c('d5', 'DEF', 0.5),
  c('m1', 'MID', 7),
  c('m2', 'MID', 6),
  c('m3', 'MID', 5),
  c('m4', 'MID', 4.5),
  c('f1', 'FWD', 9),
  c('f2', 'FWD', 6),
  c('f3', 'FWD', 5.5),
  c('f4', 'FWD', 0, false),
];
const formations = ['4-4-2', '4-3-3', '3-4-3', '5-4-1'];

describe('optimizeLineup', () => {
  it('picks the formation that maximises xPts with captain', () => {
    const r = optimizeLineup(squad, { formations, captainMultiplier: 2 });
    expect(r.best?.formation).toBe('3-4-3');
    expect(r.best?.starters).toHaveLength(11);
    expect(r.best?.captainId).toBe('f1');
    // 4 + (5+4+3) + (7+6+5+4.5) + (9+6+5.5) + captain extra 9
    expect(r.best?.totalXPts).toBeCloseTo(68);
    expect(r.best?.bench.map((b) => b.playerId)).toContain('f4');
  });

  it('never selects unavailable players', () => {
    const r = optimizeLineup(squad, { formations, captainMultiplier: 2 });
    expect(r.best?.starters.some((s) => s.playerId === 'f4')).toBe(false);
  });

  it('returns ranked alternatives from other formations', () => {
    const r = optimizeLineup(squad, { formations, captainMultiplier: 2, alternatives: 2 });
    expect(r.alternatives).toHaveLength(2);
    expect(r.alternatives[0]?.totalXPts).toBeLessThanOrEqual(r.best?.totalXPts ?? 0);
  });

  it('works without captain', () => {
    const r = optimizeLineup(squad, { formations, captainMultiplier: null });
    expect(r.best?.captainId).toBeNull();
    expect(r.best?.totalXPts).toBeCloseTo(59);
  });

  it('returns null when no formation is feasible', () => {
    const r = optimizeLineup(
      squad.filter((s) => s.position !== 'GK'),
      { formations, captainMultiplier: 2 },
    );
    expect(r.best).toBeNull();
    expect(r.alternatives).toHaveLength(0);
  });
});

describe('evaluateLineup', () => {
  const xp = new Map([
    ['a', 5],
    ['b', 3],
  ]);
  it('sums xPts and applies captain', () => {
    expect(evaluateLineup(['a', 'b'], 'a', xp, 2)).toBe(13);
  });
  it('ignores captain outside the eleven, null captain and unknown ids', () => {
    expect(evaluateLineup(['a', 'b', 'zz'], 'x', xp, 2)).toBe(8);
    expect(evaluateLineup(['a'], null, xp, 2)).toBe(5);
    expect(evaluateLineup(['a'], 'a', xp, null)).toBe(5);
    expect(evaluateLineup(['zz'], 'zz', xp, 2)).toBe(0);
  });
});
