import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { difficulty, themes } from './tokens';

const AA = 4.5;

describe('design tokens accessibility (WCAG AA)', () => {
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: text on background/surface`, () => {
      for (const bg of [t.background, t.surface, t.surfaceRaised]) {
        expect(contrastRatio(t.text, bg)).toBeGreaterThanOrEqual(AA);
        expect(contrastRatio(t.textMuted, bg)).toBeGreaterThanOrEqual(AA);
      }
    });
    it(`${name}: onPrimary on primary`, () => {
      expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(AA);
    });
  }

  it('difficulty chips have readable labels', () => {
    for (const d of Object.values(difficulty)) {
      expect(contrastRatio(d.fg, d.bg)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('contrastRatio rejects invalid colors', () => {
    expect(() => contrastRatio('red', '#000000')).toThrow();
  });
});
