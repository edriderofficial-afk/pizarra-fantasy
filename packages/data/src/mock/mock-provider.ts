import {
  type CompetitionId,
  FixtureSchema,
  LeagueSchema,
  MarketListingSchema,
  MatchdayLiveSchema,
  OfferSchema,
  type Player,
  PlayerMatchStatsSchema,
  PlayerSchema,
  type PricePoint,
  SquadSchema,
  StandingSchema,
  TeamSchema,
} from '@pizarra/core';
import { z } from 'zod';
import { DataError, type DataProvider, type SeasonState } from '../provider';
import fixturesJson from './fixtures/fixtures.json';
import leaguesJson from './fixtures/leagues.json';
import metaJson from './fixtures/meta.json';
import playersJson from './fixtures/players.json';
import pricesJson from './fixtures/prices.json';
import statsJson from './fixtures/stats.json';
import teamsJson from './fixtures/teams.json';

const LeagueBundleSchema = z.object({
  league: LeagueSchema,
  standings: z.array(StandingSchema),
  squads: z.array(SquadSchema),
  market: z.array(MarketListingSchema),
  offers: z.array(OfferSchema),
  live: MatchdayLiveSchema,
});

const MetaSchema = z.object({
  seed: z.number(),
  now: z.iso.datetime(),
  nextMatchday: z.number().int().positive(),
  playedMatchdays: z.number().int().nonnegative(),
});

const PricesSchema = z.object({
  startDate: z.iso.date(),
  series: z.record(z.string(), z.array(z.number().int().nonnegative())),
});

const StatsTableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))),
});

/** Parses and indexes the committed JSON fixtures once (lazily). Throws if they are invalid. */
function loadDataset() {
  const meta = MetaSchema.parse(metaJson);
  const teams = z.array(TeamSchema).parse(teamsJson);
  const players = z.array(PlayerSchema).parse(playersJson);
  const fixtures = z.array(FixtureSchema).parse(fixturesJson);
  const leagues = z.array(LeagueBundleSchema).parse(leaguesJson);
  const prices = PricesSchema.parse(pricesJson);
  const table = StatsTableSchema.parse(statsJson);
  const stats = z
    .array(PlayerMatchStatsSchema)
    .parse(table.rows.map((row) => Object.fromEntries(table.columns.map((c, i) => [c, row[i]]))));

  const playersById = new Map(players.map((p) => [p.id, p]));
  const statsByPlayer = new Map<string, typeof stats>();
  for (const s of stats) {
    const arr = statsByPlayer.get(s.playerId) ?? [];
    arr.push(s);
    statsByPlayer.set(s.playerId, arr);
  }
  return { meta, teams, players, playersById, fixtures, leagues, prices, stats, statsByPlayer };
}

type Dataset = ReturnType<typeof loadDataset>;

export interface MockProviderOptions {
  /** Artificial latency to exercise loading states (ms). Default 0. */
  readonly latencyMs?: number;
}

export function createMockProvider(options: MockProviderOptions = {}): DataProvider {
  let dataset: Dataset | null = null;
  const data = (): Dataset => (dataset ??= loadDataset());
  const latency = options.latencyMs ?? 0;

  async function respond<T>(fn: (d: Dataset) => T): Promise<T> {
    if (latency > 0) await new Promise((r) => setTimeout(r, latency));
    // structuredClone: callers can never mutate the shared fixtures
    return structuredClone(fn(data()));
  }

  const bundle = (d: Dataset, leagueId: string) => {
    const b = d.leagues.find((l) => l.league.id === leagueId);
    if (!b) throw new DataError('not_found', `League ${leagueId} not found`);
    return b;
  };
  const player = (d: Dataset, id: string): Player => {
    const p = d.playersById.get(id);
    if (!p) throw new DataError('not_found', `Player ${id} not found`);
    return p;
  };
  const byCompetition = <T extends { competition: CompetitionId }>(list: T[], c: CompetitionId) =>
    list.filter((x) => x.competition === c);
  const playerCompetition = (d: Dataset, playerId: string) => player(d, playerId).competition;

  return {
    kind: 'mock',
    getSeasonState: (competition) =>
      respond((d): SeasonState => ({
        competition,
        nextMatchday: d.meta.nextMatchday,
        lastPlayedMatchday: d.meta.playedMatchdays,
        now: d.meta.now,
      })),
    getLeagues: () => respond((d) => d.leagues.map((l) => l.league)),
    getStandings: (leagueId) => respond((d) => bundle(d, leagueId).standings),
    getSquad: (leagueId) =>
      respond((d) => {
        const b = bundle(d, leagueId);
        const mine = b.squads.find((s) => s.managerId === b.league.myManagerId);
        if (!mine) throw new DataError('not_found', `No squad for ${leagueId}`);
        return mine;
      }),
    getRivalSquad: (leagueId, managerId) =>
      respond((d) => {
        const s = bundle(d, leagueId).squads.find((x) => x.managerId === managerId);
        if (!s) throw new DataError('not_found', `Manager ${managerId} not found`);
        return s;
      }),
    getMarket: (leagueId) => respond((d) => bundle(d, leagueId).market),
    getOffers: (leagueId) => respond((d) => bundle(d, leagueId).offers),
    getTeams: (competition) => respond((d) => byCompetition(d.teams, competition)),
    getPlayers: (competition) => respond((d) => byCompetition(d.players, competition)),
    getPlayer: (playerId) => respond((d) => player(d, playerId)),
    getPlayerHistory: (playerId) =>
      respond((d) => {
        player(d, playerId);
        return [...(d.statsByPlayer.get(playerId) ?? [])].sort((a, b) => a.matchday - b.matchday);
      }),
    getMatchStats: (competition) =>
      respond((d) => d.stats.filter((s) => playerCompetition(d, s.playerId) === competition)),
    getPriceHistory: (playerId) =>
      respond((d) => {
        player(d, playerId);
        const series = d.prices.series[playerId] ?? [];
        const start = Date.parse(`${d.prices.startDate}T00:00:00Z`);
        return series.map((price, i): PricePoint => ({
          playerId,
          date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
          price,
        }));
      }),
    getFixtures: (competition) => respond((d) => byCompetition(d.fixtures, competition)),
    getMatchdayLive: (leagueId) => respond((d) => bundle(d, leagueId).live),
  };
}
