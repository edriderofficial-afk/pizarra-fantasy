import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DataError } from '../provider';
import type { EndpointDefinition } from './endpoints';
import { createFantasyProvider, defineMapper } from './fantasy-provider';
import type { HttpClient } from './http';

const fakeHttp = (body: unknown): HttpClient => ({
  request: (_e, schema) => Promise.resolve(schema.parse(body)),
  clearCache: () => undefined,
});
const teamsEndpoint: EndpointDefinition = { method: 'GET', path: '/teams', auth: 'none' };
const RawTeams = z.array(z.object({ teamId: z.number(), fullName: z.string(), abbr: z.string() }));
const teamsMapper = defineMapper({
  schema: RawTeams,
  params: () => ({}),
  map: (raw, args) =>
    raw.map((t) => ({
      id: String(t.teamId),
      name: t.fullName,
      shortName: t.abbr,
      competition: args.competition,
    })),
});

describe('createFantasyProvider', () => {
  it('maps raw responses into validated domain objects', async () => {
    const p = createFantasyProvider({
      http: fakeHttp([{ teamId: 7, fullName: 'Equipo', abbr: 'EQU' }]),
      endpoints: { teams: teamsEndpoint },
      mappers: { teams: teamsMapper },
      isEnabled: () => true,
    });
    expect(p.kind).toBe('fantasy');
    await expect(p.getTeams('primera')).resolves.toEqual([
      { id: '7', name: 'Equipo', shortName: 'EQU', competition: 'primera' },
    ]);
  });

  it('rejects mapper output that breaks the domain contract', async () => {
    const p = createFantasyProvider({
      http: fakeHttp([{ teamId: 7, fullName: 'Equipo', abbr: 'TOOLONG' }]),
      endpoints: { teams: teamsEndpoint },
      mappers: { teams: teamsMapper },
      isEnabled: () => true,
    });
    await expect(p.getTeams('primera')).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('is unavailable when disabled remotely or not mapped yet', async () => {
    const disabled = createFantasyProvider({
      http: fakeHttp([]),
      endpoints: {},
      mappers: {},
      isEnabled: () => false,
    });
    await expect(disabled.getLeagues()).rejects.toBeInstanceOf(DataError);
    const unmapped = createFantasyProvider({
      http: fakeHttp([]),
      endpoints: {},
      mappers: {},
      isEnabled: () => true,
    });
    const calls = [
      unmapped.getSeasonState('primera'),
      unmapped.getLeagues(),
      unmapped.getStandings('l'),
      unmapped.getSquad('l'),
      unmapped.getRivalSquad('l', 'm'),
      unmapped.getMarket('l'),
      unmapped.getOffers('l'),
      unmapped.getTeams('primera'),
      unmapped.getPlayers('primera'),
      unmapped.getPlayer('p'),
      unmapped.getPlayerHistory('p'),
      unmapped.getMatchStats('primera'),
      unmapped.getPriceHistory('p'),
      unmapped.getFixtures('primera'),
      unmapped.getMatchdayLive('l'),
    ];
    for (const c of calls) await expect(c).rejects.toMatchObject({ code: 'unavailable' });
  });
});
