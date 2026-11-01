import { z } from 'zod';

/**
 * Domain model shared by every DataProvider and by the analytics engine.
 * Providers MUST return data that parses with these schemas.
 */

export const PositionSchema = z.enum(['GK', 'DEF', 'MID', 'FWD']);
export type Position = z.infer<typeof PositionSchema>;
export const POSITIONS: readonly Position[] = PositionSchema.options;

export const CompetitionIdSchema = z.enum(['primera', 'hypermotion']);
export type CompetitionId = z.infer<typeof CompetitionIdSchema>;

export const PlayerStatusSchema = z.enum(['available', 'doubtful', 'injured', 'suspended']);
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;

const Id = z.string().min(1);
const Money = z.number().int();
const IsoDateTime = z.iso.datetime();
const IsoDate = z.iso.date();

export const TeamSchema = z.object({
  id: Id,
  name: z.string().min(1),
  shortName: z.string().min(2).max(4),
  competition: CompetitionIdSchema,
});
export type Team = z.infer<typeof TeamSchema>;

export const SetPiecesSchema = z.object({
  penalties: z.boolean(),
  freeKicks: z.boolean(),
  corners: z.boolean(),
});
export type SetPieces = z.infer<typeof SetPiecesSchema>;

export const PlayerSchema = z.object({
  id: Id,
  name: z.string().min(1),
  teamId: Id,
  competition: CompetitionIdSchema,
  position: PositionSchema,
  /** Current market value in euros. */
  price: Money.nonnegative(),
  status: PlayerStatusSchema,
  setPieces: SetPiecesSchema,
});
export type Player = z.infer<typeof PlayerSchema>;

export const FixtureStatusSchema = z.enum(['scheduled', 'live', 'finished']);

export const FixtureSchema = z.object({
  id: Id,
  competition: CompetitionIdSchema,
  matchday: z.number().int().positive(),
  homeTeamId: Id,
  awayTeamId: Id,
  kickoff: IsoDateTime,
  status: FixtureStatusSchema,
  homeGoals: z.number().int().nonnegative().nullable(),
  awayGoals: z.number().int().nonnegative().nullable(),
});
export type Fixture = z.infer<typeof FixtureSchema>;

export const PlayerMatchStatsSchema = z.object({
  playerId: Id,
  fixtureId: Id,
  matchday: z.number().int().positive(),
  started: z.boolean(),
  minutes: z.number().int().min(0).max(130),
  /** Official fantasy points for the match (including the 0–4 algorithmic bonus). */
  points: z.number().int(),
  goals: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  shots: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  clearances: z.number().int().nonnegative(),
  duelsWon: z.number().int().nonnegative(),
  possessionsLost: z.number().int().nonnegative(),
  goalsConceded: z.number().int().nonnegative(),
  yellowCards: z.number().int().min(0).max(2),
  redCards: z.number().int().min(0).max(1),
});
export type PlayerMatchStats = z.infer<typeof PlayerMatchStatsSchema>;

export const PricePointSchema = z.object({
  playerId: Id,
  date: IsoDate,
  price: Money.nonnegative(),
});
export type PricePoint = z.infer<typeof PricePointSchema>;

export const LeagueSchema = z.object({
  id: Id,
  name: z.string().min(1),
  competition: CompetitionIdSchema,
  /** The signed-in user's manager id within this league. */
  myManagerId: Id,
  marketClosesAt: IsoDateTime,
});
export type League = z.infer<typeof LeagueSchema>;

export const StandingSchema = z.object({
  managerId: Id,
  managerName: z.string().min(1),
  rank: z.number().int().positive(),
  points: z.number().int(),
  lastMatchdayPoints: z.number().int(),
  teamValue: Money.nonnegative(),
});
export type Standing = z.infer<typeof StandingSchema>;

export const LineupSchema = z.object({
  formation: z.string().regex(/^\d-\d-\d$/),
  playerIds: z.array(Id).length(11),
  captainId: Id.nullable(),
});
export type Lineup = z.infer<typeof LineupSchema>;

export const SquadPlayerSchema = z.object({
  playerId: Id,
  purchasePrice: Money.nonnegative(),
  /** Release clause amount in euros. */
  clause: Money.nonnegative(),
  /** Clause cannot be triggered before this instant (protection / shield). */
  clauseLockedUntil: IsoDateTime.nullable(),
});
export type SquadPlayer = z.infer<typeof SquadPlayerSchema>;

export const SquadSchema = z.object({
  leagueId: Id,
  managerId: Id,
  managerName: z.string().min(1),
  balance: Money,
  players: z.array(SquadPlayerSchema),
  lineup: LineupSchema.nullable(),
});
export type Squad = z.infer<typeof SquadSchema>;

export const MarketListingSchema = z.object({
  playerId: Id,
  askingPrice: Money.nonnegative(),
  /** null = listed by the game itself (free agent). */
  sellerManagerId: Id.nullable(),
  expiresAt: IsoDateTime,
});
export type MarketListing = z.infer<typeof MarketListingSchema>;

export const OfferSchema = z.object({
  id: Id,
  playerId: Id,
  fromManagerId: Id.nullable(),
  amount: Money.nonnegative(),
  expiresAt: IsoDateTime,
});
export type Offer = z.infer<typeof OfferSchema>;

export const MatchdayLiveSchema = z.object({
  leagueId: Id,
  matchday: z.number().int().positive(),
  updatedAt: IsoDateTime,
  entries: z.array(
    z.object({
      managerId: Id,
      managerName: z.string().min(1),
      points: z.number().int(),
      playersPending: z.number().int().nonnegative(),
    }),
  ),
});
export type MatchdayLive = z.infer<typeof MatchdayLiveSchema>;
