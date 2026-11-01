import { optimizeLineup, projectMatchday, season202627 } from '@pizarra/core';
import { describe, expect, it } from 'vitest';
import { DataError } from '../provider';
import { createMockProvider } from './mock-provider';

const provider = createMockProvider();

describe('MockProvider', () => {
  it('loads fixtures that validate against the domain schemas', async () => {
    const leagues = await provider.getLeagues();
    expect(leagues.length).toBeGreaterThanOrEqual(2);
    expect(leagues.map((l) => l.competition)).toContain('hypermotion');
  });

  it('serves a coherent primera league', async () => {
    const [league] = await provider.getLeagues();
    if (!league) throw new Error('no league');
    const [squad, standings, market, offers, live] = await Promise.all([
      provider.getSquad(league.id),
      provider.getStandings(league.id),
      provider.getMarket(league.id),
      provider.getOffers(league.id),
      provider.getMatchdayLive(league.id),
    ]);
    expect(squad.managerId).toBe(league.myManagerId);
    expect(squad.players.length).toBeGreaterThanOrEqual(season202627.squad.initialSize);
    expect(standings.map((s) => s.rank)).toEqual(standings.map((_, i) => i + 1));
    expect(market.length).toBeGreaterThan(0);
    expect(offers.every((o) => squad.players.some((p) => p.playerId === o.playerId))).toBe(true);
    expect(live.entries).toHaveLength(standings.length);

    const rival = standings.find((s) => s.managerId !== league.myManagerId);
    if (!rival) throw new Error('no rival');
    const rivalSquad = await provider.getRivalSquad(league.id, rival.managerId);
    expect(rivalSquad.managerId).toBe(rival.managerId);
  });

  it('serves players, history and prices', async () => {
    const players = await provider.getPlayers('primera');
    const first = players[0];
    if (!first) throw new Error('no players');
    const [p, history, prices] = await Promise.all([
      provider.getPlayer(first.id),
      provider.getPlayerHistory(first.id),
      provider.getPriceHistory(first.id),
    ]);
    expect(p.id).toBe(first.id);
    expect(history.map((h) => h.matchday)).toEqual(
      [...history.map((h) => h.matchday)].sort((a, b) => a - b),
    );
    expect(prices.at(-1)?.price).toBe(p.price);
  });

  it('separates competitions', async () => {
    const [teams, fixtures, stats, state] = await Promise.all([
      provider.getTeams('hypermotion'),
      provider.getFixtures('hypermotion'),
      provider.getMatchStats('hypermotion'),
      provider.getSeasonState('hypermotion'),
    ]);
    expect(teams.every((t) => t.competition === 'hypermotion')).toBe(true);
    expect(fixtures.every((f) => f.competition === 'hypermotion')).toBe(true);
    expect(stats.length).toBeGreaterThan(0);
    expect(state.nextMatchday).toBe(state.lastPlayedMatchday + 1);
  });

  it('feeds the analytics engine end to end', async () => {
    const [league] = await provider.getLeagues();
    if (!league) throw new Error('no league');
    const [players, fixtures, stats, state, squad] = await Promise.all([
      provider.getPlayers('primera'),
      provider.getFixtures('primera'),
      provider.getMatchStats('primera'),
      provider.getSeasonState('primera'),
      provider.getSquad(league.id),
    ]);
    const projections = projectMatchday({ players, fixtures, stats, matchday: state.nextMatchday });
    const byId = new Map(players.map((p) => [p.id, p]));
    const candidates = squad.players.map((sp) => {
      const proj = projections.get(sp.playerId);
      const pl = byId.get(sp.playerId);
      if (!proj || !pl) throw new Error('missing');
      return { playerId: pl.id, position: pl.position, xPts: proj.xPts, available: proj.xPts > 0 };
    });
    const plan = optimizeLineup(candidates, {
      formations: season202627.lineup.formations,
      captainMultiplier: season202627.captain.multiplier,
    });
    expect(plan.best?.starters).toHaveLength(11);
  });

  it('rejects unknown ids with DataError', async () => {
    await expect(provider.getPlayer('nope')).rejects.toBeInstanceOf(DataError);
    await expect(provider.getStandings('nope')).rejects.toMatchObject({ code: 'not_found' });
    await expect(provider.getRivalSquad('lg-amigos', 'nope')).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('returns copies so callers cannot mutate fixtures', async () => {
    const a = await provider.getLeagues();
    (a[0] as { name: string }).name = 'hacked';
    const b = await provider.getLeagues();
    expect(b[0]?.name).not.toBe('hacked');
  });

  it('supports artificial latency', async () => {
    const slow = createMockProvider({ latencyMs: 5 });
    await expect(slow.getLeagues()).resolves.toHaveLength(2);
  });
});
