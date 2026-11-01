import { describe, expect, it } from 'vitest';
import { parseFormation } from './formations';
import { parseSeasonRules, unverifiedSections } from './schema';
import { season202627 } from './season-2026-27';

describe('season 2026-27 rules', () => {
  it('parses and includes Hypermotion', () => {
    expect(season202627.competitions).toContain('hypermotion');
  });

  it('every configured formation is valid', () => {
    for (const f of season202627.lineup.formations) {
      const slots = parseFormation(f);
      expect(slots.GK + slots.DEF + slots.MID + slots.FWD).toBe(11);
    }
  });

  it('flags unverified sections instead of hiding them', () => {
    const pending = unverifiedSections(season202627);
    expect(pending).toContain('scoring');
    expect(pending).not.toContain('algorithmicBonus');
  });

  it('rejects inconsistent bonus range', () => {
    const bad = {
      ...season202627,
      algorithmicBonus: { ...season202627.algorithmicBonus, min: 5, max: 1 },
    };
    expect(() => parseSeasonRules(bad)).toThrow(/algorithmicBonus/);
  });

  it('rejects malformed input', () => {
    expect(() => parseSeasonRules({ season: '26/27' })).toThrow();
  });
});

describe('parseFormation', () => {
  it('parses 4-3-3', () => {
    expect(parseFormation('4-3-3')).toEqual({ GK: 1, DEF: 4, MID: 3, FWD: 3 });
  });
  it('rejects invalid codes', () => {
    expect(() => parseFormation('4-4')).toThrow(/Invalid/);
    expect(() => parseFormation('4-4-3')).toThrow(/10 outfield/);
  });
});
