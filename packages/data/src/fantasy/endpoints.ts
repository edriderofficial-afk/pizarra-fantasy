/**
 * LALIGA Fantasy endpoints.
 *
 * Intentionally EMPTY: the API is not public and we do not guess endpoints.
 * Entries are filled in Phase 2B from a HAR captured by the project owner
 * (see scripts/har-to-types.ts), each with a Zod schema for its response.
 */
export type FantasyOperation =
  | 'seasonState'
  | 'leagues'
  | 'standings'
  | 'squad'
  | 'rivalSquad'
  | 'market'
  | 'offers'
  | 'teams'
  | 'players'
  | 'player'
  | 'playerHistory'
  | 'matchStats'
  | 'priceHistory'
  | 'fixtures'
  | 'matchdayLive';

export interface EndpointDefinition {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Path template relative to the base URL, e.g. "/leagues/{leagueId}". */
  readonly path: string;
  /** 'none' = works without a user session (usable by ingest, strategy A). */
  readonly auth: 'none' | 'user';
}

export const endpoints: Partial<Record<FantasyOperation, EndpointDefinition>> = {};
