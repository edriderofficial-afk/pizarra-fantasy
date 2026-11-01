import { describe, expect, it } from 'vitest';
import { formatMillions } from './format';

describe('formatMillions', () => {
  it('formats with one decimal in Spanish by default', () => {
    expect(formatMillions(12_345_000)).toBe('12,3M');
  });

  it('drops trailing zero decimals', () => {
    expect(formatMillions(5_000_000)).toBe('5M');
  });

  it('supports other locales', () => {
    expect(formatMillions(12_345_000, 'en-GB')).toBe('12.3M');
  });

  it('handles negative balances', () => {
    expect(formatMillions(-2_500_000)).toBe('-2,5M');
  });

  it('rejects non-finite input', () => {
    expect(() => formatMillions(Number.NaN)).toThrow(RangeError);
  });
});
