import type {
  CompetitionId,
  Fixture,
  League,
  MarketListing,
  MatchdayLive,
  Offer,
  Player,
  PlayerMatchStats,
  PricePoint,
  Squad,
  Standing,
  Team,
} from '@pizarra/core';

/**
 * Data access contract. Every source (mock, LALIGA Fantasy, our backend) implements it;
 * apps only talk to a DataProvider. Implementations must return data valid against the
 * Zod schemas in @pizarra/core and reject with DataError on failure.
 */
export type DataProviderKind = 'mock' | 'fantasy';

export interface SeasonState {
  readonly competition: CompetitionId;
  /** Next matchday to be played (the one projections target). */
  readonly nextMatchday: number;
  readonly lastPlayedMatchday: number;
  /** Provider clock; the mock uses a fixed instant so the UI is reproducible. */
  readonly now: string;
}

export interface DataProvider {
  readonly kind: DataProviderKind;
  getSeasonState(competition: CompetitionId): Promise<SeasonState>;
  getLeagues(): Promise<League[]>;
  getStandings(leagueId: string): Promise<Standing[]>;
  /** The signed-in user's squad in a league. */
  getSquad(leagueId: string): Promise<Squad>;
  getRivalSquad(leagueId: string, managerId: string): Promise<Squad>;
  getMarket(leagueId: string): Promise<MarketListing[]>;
  getOffers(leagueId: string): Promise<Offer[]>;
  getTeams(competition: CompetitionId): Promise<Team[]>;
  getPlayers(competition: CompetitionId): Promise<Player[]>;
  getPlayer(playerId: string): Promise<Player>;
  getPlayerHistory(playerId: string): Promise<PlayerMatchStats[]>;
  /** All match stats of a competition (used to compute projections). */
  getMatchStats(competition: CompetitionId): Promise<PlayerMatchStats[]>;
  getPriceHistory(playerId: string): Promise<PricePoint[]>;
  getFixtures(competition: CompetitionId): Promise<Fixture[]>;
  getMatchdayLive(leagueId: string): Promise<MatchdayLive>;
}

export type DataErrorCode = 'not_found' | 'invalid_response' | 'unauthorized' | 'unavailable';

export class DataError extends Error {
  readonly code: DataErrorCode;
  constructor(code: DataErrorCode, message: string) {
    super(message);
    this.name = 'DataError';
    this.code = code;
  }
}
