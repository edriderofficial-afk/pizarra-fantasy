import { describe, expect, it } from 'vitest';
import { bestByMetric } from './compare';

describe('bestByMetric', () => {
  const rows = [
    { id: 'a', metrics: { points: 50, cards: 3, price: null } },
    { id: 'b', metrics: { points: 50, cards: 1, price: 9 } },
    { id: 'c', metrics: { points: 40, cards: 1, price: 12 } },
  ];
  it('handles higher/lower, ties and nulls', () => {
    const r = bestByMetric(rows, {
      points: 'higher',
      cards: 'lower',
      price: 'lower',
      missing: 'higher',
    });
    expect(r.points).toEqual(['a', 'b']);
    expect(r.cards).toEqual(['b', 'c']);
    expect(r.price).toEqual(['b']);
    expect(r.missing).toEqual([]);
  });
});
