import {
  type CompetitionId,
  FixtureSchema,
  LeagueSchema,
  MarketListingSchema,
  MatchdayLiveSchema,
  OfferSchema,
  PlayerMatchStatsSchema,
  PlayerSchema,
  PricePointSchema,
  SquadSchema,
  StandingSchema,
  TeamSchema,
} from '@pizarra/core';
import { z } from 'zod';
import { DataError, type DataProvider, type SeasonState } from '../provider';
import type { EndpointDefinition, FantasyOperation } from './endpoints';
import type { HttpClient, RequestParams } from './http';

/** Arguments every operation may need to build its request. */
export interface OperationArgs {
  readonly competition?: CompetitionId;
  readonly leagueId?: string;
  readonly managerId?: string;
  readonly playerId?: string;
}

/**
 * Translates one LALIGA Fantasy response into our domain model. `schema` validates the raw
 * response (generated from the HAR); the provider then validates the mapped output against
 * the domain schemas, so the app never sees unvalidated data.
 */
export interface OperationMapper<Raw = unknown> {
  readonly schema: z.ZodType<Raw>;
  readonly params: (args: OperationArgs) => RequestParams;
  readonly map: (raw: Raw, args: OperationArgs) => unknown;
}

/** Type-erased mapper, as stored in the registry. Build one with `defineMapper`. */
export type AnyOperationMapper = OperationMapper<unknown>;

/** Keeps the raw type checked while defining the mapper, then erases it for the registry. */
export function defineMapper<Raw>(mapper: OperationMapper<Raw>): AnyOperationMapper {
  return mapper as unknown as AnyOperationMapper;
}

export type FantasyMappers = Partial<Record<FantasyOperation, AnyOperationMapper>>;

export interface FantasyProviderOptions {
  readonly http: HttpClient;
  readonly endpoints: Partial<Record<FantasyOperation, EndpointDefinition>>;
  readonly mappers: FantasyMappers;
  /** Remote kill switch (remote_config.fantasy_provider_enabled). */
  readonly isEnabled: () => boolean;
}

const SeasonStateSchema = z.object({
  competition: z.enum(['primera', 'hypermotion']),
  nextMatchday: z.number().int().positive(),
  lastPlayedMatchday: z.number().int().nonnegative(),
  now: z.iso.datetime(),
});

const OUTPUT = {
  seasonState: SeasonStateSchema,
  leagues: z.array(LeagueSchema),
  standings: z.array(StandingSchema),
  squad: SquadSchema,
  rivalSquad: SquadSchema,
  market: z.array(MarketListingSchema),
  offers: z.array(OfferSchema),
  teams: z.array(TeamSchema),
  players: z.array(PlayerSchema),
  player: PlayerSchema,
  playerHistory: z.array(PlayerMatchStatsSchema),
  matchStats: z.array(PlayerMatchStatsSchema),
  priceHistory: z.array(PricePointSchema),
  fixtures: z.array(FixtureSchema),
  matchdayLive: MatchdayLiveSchema,
} as const satisfies Record<FantasyOperation, z.ZodType>;

type Output<Op extends FantasyOperation> = z.infer<(typeof OUTPUT)[Op]>;

export function createFantasyProvider(options: FantasyProviderOptions): DataProvider {
  async function call<Op extends FantasyOperation>(
    op: Op,
    args: OperationArgs,
  ): Promise<Output<Op>> {
    if (!options.isEnabled())
      throw new DataError('unavailable', 'LALIGA Fantasy provider disabled remotely');
    const endpoint = options.endpoints[op];
    const mapper = options.mappers[op];
    if (!endpoint || !mapper)
      throw new DataError('unavailable', `Operation "${op}" is not mapped yet`);
    const raw = await options.http.request(endpoint, mapper.schema, mapper.params(args));
    const parsed = OUTPUT[op].safeParse(mapper.map(raw, args));
    if (!parsed.success)
      throw new DataError('invalid_response', `Mapper for "${op}" produced invalid data`);
    return parsed.data as Output<Op>;
  }

  return {
    kind: 'fantasy',
    getSeasonState: (competition) => call('seasonState', { competition }) as Promise<SeasonState>,
    getLeagues: () => call('leagues', {}),
    getStandings: (leagueId) => call('standings', { leagueId }),
    getSquad: (leagueId) => call('squad', { leagueId }),
    getRivalSquad: (leagueId, managerId) => call('rivalSquad', { leagueId, managerId }),
    getMarket: (leagueId) => call('market', { leagueId }),
    getOffers: (leagueId) => call('offers', { leagueId }),
    getTeams: (competition) => call('teams', { competition }),
    getPlayers: (competition) => call('players', { competition }),
    getPlayer: (playerId) => call('player', { playerId }),
    getPlayerHistory: (playerId) => call('playerHistory', { playerId }),
    getMatchStats: (competition) => call('matchStats', { competition }),
    getPriceHistory: (playerId) => call('priceHistory', { playerId }),
    getFixtures: (competition) => call('fixtures', { competition }),
    getMatchdayLive: (leagueId) => call('matchdayLive', { leagueId }),
  };
}
