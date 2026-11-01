import { describe, expect, it } from 'vitest';
import { match } from '../test/factories';
import { clamp, ewma, shrink, stdDev } from './ewma';
import { summarizePlayer } from './summary';

describe('ewma', () => {
  it('returns null for empty input', () => {
    expect(ewma([], 3)).toBeNull();
  });
  it('equals the value for a constant series', () => {
    expect(ewma([4, 4, 4], 2)).toBeCloseTo(4);
  });
  it('weights recent values more', () => {
    const v = ewma([0, 10], 1) as number;
    expect(v).toBeGreaterThan(5);
    expect(v).toBeCloseTo(10 / 1.5);
  });
  it('applies sample weights', () => {
    expect(ewma([0, 10], 1000, [1, 0])).toBeCloseTo(0);
    expect(ewma([0, 10], 1000, [0, 0])).toBeNull();
  });
  it('validates arguments', () => {
    expect(() => ewma([1], 0)).toThrow(RangeError);
    expect(() => ewma([1, 2], 1, [1])).toThrow(RangeError);
  });
});

describe('stdDev / shrink / clamp', () => {
  it('stdDev needs 2+ values', () => {
    expect(stdDev([1])).toBeNull();
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
  it('shrink falls back to prior and blends', () => {
    expect(shrink(null, 5, 3, 2)).toBe(3);
    expect(shrink(10, 0, 3, 2)).toBe(3);
    expect(shrink(10, 2, 0, 2)).toBe(5);
  });
  it('clamp', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

describe('summarizePlayer', () => {
  it('aggregates totals and averages over matches played', () => {
    const s = summarizePlayer([
      match(2, { points: 8, goals: 1 }),
      match(1, { points: 4, assists: 1, yellowCards: 1 }),
      match(3, { started: false, minutes: 0, points: 0 }),
    ]);
    expect(s.matchesPlayed).toBe(2);
    expect(s.starts).toBe(2);
    expect(s.totalPoints).toBe(12);
    expect(s.averagePoints).toBe(6);
    expect(s.lastPoints).toBe(0);
    expect(s.goals).toBe(1);
    expect(s.assists).toBe(1);
    expect(s.yellowCards).toBe(1);
    expect(s.minutes).toBe(180);
  });
  it('handles empty history', () => {
    const s = summarizePlayer([]);
    expect(s.averagePoints).toBeNull();
    expect(s.lastPoints).toBeNull();
  });
});
