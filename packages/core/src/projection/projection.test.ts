import { describe, expect, it } from 'vitest';
import { fixture, match, player } from '../test/factories';
import { projectMatchday, upcomingFixtures } from './projection';

const fixtures = [
  fixture(1, 'A', 'B', [3, 0]),
  fixture(1, 'C', 'D', [1, 1]),
  fixture(2, 'B', 'A', null),
  fixture(3, 'A', 'C', null),
  fixture(4, 'D', 'A', null),
];

describe('projectMatchday', () => {
  const players = [player({ id: 'a1', teamId: 'A' }), player({ id: 'c1', teamId: 'C' })];
  const stats = [match(1, { playerId: 'a1', points: 9 }), match(2, { playerId: 'a1', points: 99 })];
  const out = projectMatchday({ players, fixtures, stats, matchday: 2 });

  it('attaches fixture outlook with opponent and venue', () => {
    const a1 = out.get('a1');
    expect(a1?.fixture?.opponentTeamId).toBe('B');
    expect(a1?.fixture?.isHome).toBe(false);
    expect(a1?.fixture?.difficulty).toBeGreaterThanOrEqual(1);
  });

  it('players without a fixture project zero', () => {
    expect(out.get('c1')?.fixture).toBeNull();
    expect(out.get('c1')?.xPts).toBe(0);
  });

  it('ignores stats from the target matchday onward', () => {
    expect(out.get('a1')?.xPts).toBeLessThan(15);
  });
});

describe('upcomingFixtures', () => {
  it('returns the next N fixtures in order with difficulty', () => {
    const next = upcomingFixtures('A', fixtures, 2, 2);
    expect(next.map((f) => f.matchday)).toEqual([2, 3]);
    expect(next[0]?.isHome).toBe(false);
    expect(next[1]?.opponentTeamId).toBe('C');
  });
});
