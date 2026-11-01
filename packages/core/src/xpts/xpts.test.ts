import { describe, expect, it } from 'vitest';
import { match, player } from '../test/factories';
import { DEFAULT_XPTS_CONFIG } from './config';
import { type FixtureContext, expectedPoints } from './xpts';

const neutral: FixtureContext = { isHome: true, opponent: { attack: 1, defense: 1 } };
const regular = [1, 2, 3, 4, 5, 6].map((md) => match(md, { points: 8 }));

describe('expectedPoints', () => {
  it('returns zero with a noFixture reason when the team does not play', () => {
    const r = expectedPoints({ player: player(), history: regular, fixture: null });
    expect(r.xPts).toBe(0);
    expect(r.reasons[0]?.code).toBe('noFixture');
  });

  it('falls back to priors without history and flags low sample', () => {
    const r = expectedPoints({ player: player(), history: [], fixture: neutral });
    expect(r.pStart).toBeCloseTo(DEFAULT_XPTS_CONFIG.priorStartProbability);
    expect(r.reasons.some((x) => x.code === 'lowSample')).toBe(true);
  });

  it('a regular high scorer projects above the prior', () => {
    const r = expectedPoints({ player: player(), history: regular, fixture: neutral });
    expect(r.pStart).toBeGreaterThan(0.6);
    expect(r.xPts).toBeGreaterThan(4);
    expect(r.p10).toBeLessThan(r.xPts);
    expect(r.p90).toBeGreaterThan(r.xPts);
  });

  it('is independent of history order', () => {
    const a = expectedPoints({ player: player(), history: regular, fixture: neutral });
    const b = expectedPoints({
      player: player(),
      history: [...regular].reverse(),
      fixture: neutral,
    });
    expect(a.xPts).toBeCloseTo(b.xPts);
  });

  it('injured or suspended players project zero; doubtful are discounted', () => {
    const base = expectedPoints({ player: player(), history: regular, fixture: neutral });
    const injured = expectedPoints({
      player: player({ status: 'injured' }),
      history: regular,
      fixture: neutral,
    });
    const doubtful = expectedPoints({
      player: player({ status: 'doubtful' }),
      history: regular,
      fixture: neutral,
    });
    expect(injured.xPts).toBe(0);
    expect(injured.reasons[0]?.code).toBe('status');
    expect(doubtful.xPts).toBeCloseTo(base.xPts / 2, 5);
  });

  it('home beats away and a weak defence helps forwards', () => {
    const fwd = player({ position: 'FWD' });
    const home = expectedPoints({ player: fwd, history: regular, fixture: neutral });
    const away = expectedPoints({
      player: fwd,
      history: regular,
      fixture: { ...neutral, isHome: false },
    });
    const weakDef = expectedPoints({
      player: fwd,
      history: regular,
      fixture: { isHome: true, opponent: { attack: 1, defense: 1.6 } },
    });
    expect(home.xPts).toBeGreaterThan(away.xPts);
    expect(weakDef.xPts).toBeGreaterThan(home.xPts);
  });

  it('a strong attack hurts goalkeepers', () => {
    const gk = player({ position: 'GK' });
    const easy = expectedPoints({
      player: gk,
      history: regular,
      fixture: { isHome: true, opponent: { attack: 0.6, defense: 1 } },
    });
    const hard = expectedPoints({
      player: gk,
      history: regular,
      fixture: { isHome: true, opponent: { attack: 1.6, defense: 1 } },
    });
    expect(easy.xPts).toBeGreaterThan(hard.xPts);
  });

  it('set-piece duties add points and a reason', () => {
    const taker = player({ setPieces: { penalties: true, freeKicks: true, corners: true } });
    const base = expectedPoints({ player: player(), history: regular, fixture: neutral });
    const r = expectedPoints({ player: taker, history: regular, fixture: neutral });
    expect(r.xPts).toBeGreaterThan(base.xPts);
    expect(r.reasons.some((x) => x.code === 'setPieces')).toBe(true);
  });

  it('bench players get substitute expectation', () => {
    const history = [1, 2, 3, 4, 5].map((md) =>
      match(md, { started: false, minutes: 20, points: 2 }),
    );
    const r = expectedPoints({ player: player(), history, fixture: neutral });
    expect(r.pStart).toBeLessThan(0.3);
    expect(r.pSub).toBeGreaterThan(0.4);
    expect(r.expectedIfSub).toBeGreaterThan(0);
  });

  it('short starts weigh less than full matches', () => {
    const history = [match(1, { points: 10, minutes: 90 }), match(2, { points: 0, minutes: 15 })];
    const r = expectedPoints(
      { player: player(), history, fixture: neutral },
      { ...DEFAULT_XPTS_CONFIG, shrinkMatches: 0.0001 },
    );
    expect(r.expectedIfStart).toBeGreaterThan(5);
  });

  it('reasons are sorted by absolute impact', () => {
    const r = expectedPoints({ player: player(), history: regular, fixture: neutral });
    const impacts = r.reasons.map((x) => Math.abs(x.impact));
    expect(impacts).toEqual([...impacts].sort((a, b) => b - a));
  });
});
