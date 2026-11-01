import { describe, expect, it } from 'vitest';
import { matchDifficulty, opponentStrength } from '../difficulty/difficulty';
import { fixture } from '../test/factories';
import { computeTeamRatings } from './team-ratings';

const fixtures = [
  fixture(1, 'A', 'B', [3, 0]),
  fixture(1, 'C', 'D', [1, 1]),
  fixture(2, 'B', 'C', [0, 2]),
  fixture(2, 'D', 'A', [0, 4]),
  fixture(3, 'A', 'C', null),
];

describe('computeTeamRatings', () => {
  it('rates strong attack above 1 and weak attack below 1', () => {
    const r = computeTeamRatings(fixtures, { beforeMatchday: 3 });
    expect(r.get('A')?.attack).toBeGreaterThan(1);
    expect(r.get('A')?.defense).toBeLessThan(1);
    expect(r.get('B')?.attack).toBeLessThan(1);
    expect(r.get('B')?.defense).toBeGreaterThan(1);
  });
  it('ignores matchdays at or after the cutoff (no leakage)', () => {
    const r = computeTeamRatings(fixtures, { beforeMatchday: 1 });
    expect(r.get('A')).toEqual({ teamId: 'A', attack: 1, defense: 1, matches: 0 });
  });
  it('handles goalless leagues without dividing by zero', () => {
    const r = computeTeamRatings([fixture(1, 'A', 'B', [0, 0])], { beforeMatchday: 2 });
    expect(Number.isFinite(r.get('A')?.attack)).toBe(true);
  });
});

describe('matchDifficulty', () => {
  it('scales from 1 to 5 with opponent strength', () => {
    expect(matchDifficulty({ attack: 0.5, defense: 1.8 }, true)).toBe(1);
    expect(matchDifficulty({ attack: 0.85, defense: 1.1 }, true)).toBe(2);
    expect(matchDifficulty({ attack: 1, defense: 1 }, true)).toBe(3);
    expect(matchDifficulty({ attack: 1, defense: 1 }, false)).toBe(3);
    expect(matchDifficulty({ attack: 1.1, defense: 0.9 }, false)).toBe(4);
    expect(matchDifficulty({ attack: 1.6, defense: 0.6 }, false)).toBe(5);
  });
  it('is harder away than at home', () => {
    const opp = { attack: 1.05, defense: 0.95 };
    expect(matchDifficulty(opp, false)).toBeGreaterThanOrEqual(matchDifficulty(opp, true));
  });
  it('honours custom venue factors', () => {
    expect(matchDifficulty({ attack: 1, defense: 1 }, true, { homeFactor: 1 })).toBe(3);
    expect(matchDifficulty({ attack: 1, defense: 1 }, false, { awayFactor: 1 })).toBe(3);
  });
  it('guards against zero defense', () => {
    expect(Number.isFinite(opponentStrength({ attack: 1, defense: 0 }))).toBe(true);
  });
});
