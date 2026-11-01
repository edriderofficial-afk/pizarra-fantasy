import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { anonRole, authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';

/**
 * Database schema (ADR 0002). Game data is public read-only; only the ingest service
 * (service_role, which bypasses RLS) writes it. User data is visible to its owner only.
 * No LALIGA credentials or tokens are ever stored here (ADR 0003).
 */

export const positionEnum = pgEnum('position', ['GK', 'DEF', 'MID', 'FWD']);
export const playerStatusEnum = pgEnum('player_status', [
  'available',
  'doubtful',
  'injured',
  'suspended',
]);
export const fixtureStatusEnum = pgEnum('fixture_status', ['scheduled', 'live', 'finished']);
export const alertKindEnum = pgEnum('alert_kind', [
  'market_close',
  'clause_unlock',
  'lineup_change',
  'injury',
  'price_trend',
  'daily_reward',
]);
export const platformEnum = pgEnum('platform', ['ios', 'android', 'web']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const money = (name: string) => bigint(name, { mode: 'number' });

/** Public read policy for game data (anon + authenticated). */
const publicRead = (table: string) =>
  pgPolicy(`${table}_public_read`, {
    for: 'select',
    to: [anonRole, authenticatedRole],
    using: sql`true`,
  });

/** Owner-only policies keyed by a user_id column. */
const ownerAll = (table: string, column = 'user_id') => {
  const own = sql.raw(`${column} = (select auth.uid())`);
  return [
    pgPolicy(`${table}_owner_select`, { for: 'select', to: authenticatedRole, using: own }),
    pgPolicy(`${table}_owner_insert`, { for: 'insert', to: authenticatedRole, withCheck: own }),
    pgPolicy(`${table}_owner_update`, {
      for: 'update',
      to: authenticatedRole,
      using: own,
      withCheck: own,
    }),
    pgPolicy(`${table}_owner_delete`, { for: 'delete', to: authenticatedRole, using: own }),
  ];
};

// ---------- Game data (public read) ----------

export const competitions = pgTable(
  'competitions',
  {
    id: text('id').primaryKey(), // 'primera' | 'hypermotion'
    name: text('name').notNull(),
  },
  () => [publicRead('competitions')],
).enableRLS();

export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey(),
    competitionId: text('competition_id')
      .notNull()
      .references(() => competitions.id),
    name: text('name').notNull(),
    shortName: text('short_name').notNull(),
    updatedAt: updatedAt(),
  },
  () => [publicRead('teams')],
).enableRLS();

export const players = pgTable(
  'players',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    competitionId: text('competition_id')
      .notNull()
      .references(() => competitions.id),
    name: text('name').notNull(),
    position: positionEnum('position').notNull(),
    status: playerStatusEnum('status').notNull(),
    setPieces: jsonb('set_pieces')
      .$type<{ penalties: boolean; freeKicks: boolean; corners: boolean }>()
      .notNull(),
    price: money('price').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [index('players_team_idx').on(t.teamId), publicRead('players')],
).enableRLS();

export const fixtures = pgTable(
  'fixtures',
  {
    id: text('id').primaryKey(),
    competitionId: text('competition_id')
      .notNull()
      .references(() => competitions.id),
    season: text('season').notNull(),
    matchday: smallint('matchday').notNull(),
    homeTeamId: text('home_team_id')
      .notNull()
      .references(() => teams.id),
    awayTeamId: text('away_team_id')
      .notNull()
      .references(() => teams.id),
    kickoff: timestamp('kickoff', { withTimezone: true }).notNull(),
    status: fixtureStatusEnum('status').notNull(),
    homeGoals: smallint('home_goals'),
    awayGoals: smallint('away_goals'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('fixtures_matchday_idx').on(t.competitionId, t.season, t.matchday),
    publicRead('fixtures'),
  ],
).enableRLS();

export const playerMatchStats = pgTable(
  'player_match_stats',
  {
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    fixtureId: text('fixture_id')
      .notNull()
      .references(() => fixtures.id),
    matchday: smallint('matchday').notNull(),
    started: boolean('started').notNull(),
    minutes: smallint('minutes').notNull(),
    points: smallint('points').notNull(),
    goals: smallint('goals').notNull(),
    assists: smallint('assists').notNull(),
    shots: smallint('shots').notNull(),
    saves: smallint('saves').notNull(),
    clearances: smallint('clearances').notNull(),
    duelsWon: smallint('duels_won').notNull(),
    possessionsLost: smallint('possessions_lost').notNull(),
    goalsConceded: smallint('goals_conceded').notNull(),
    yellowCards: smallint('yellow_cards').notNull(),
    redCards: smallint('red_cards').notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.fixtureId] }), publicRead('player_match_stats')],
).enableRLS();

export const playerPriceDaily = pgTable(
  'player_price_daily',
  {
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    date: date('date', { mode: 'string' }).notNull(),
    price: money('price').notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.date] }), publicRead('player_price_daily')],
).enableRLS();

export const predictions = pgTable(
  'predictions',
  {
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    season: text('season').notNull(),
    matchday: smallint('matchday').notNull(),
    modelVersion: text('model_version').notNull(),
    xPts: real('x_pts').notNull(),
    p10: real('p10').notNull(),
    p90: real('p90').notNull(),
    pStart: real('p_start').notNull(),
    pSub: real('p_sub').notNull(),
    reasons: jsonb('reasons').$type<{ code: string; value: number; impact: number }[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.season, t.matchday, t.modelVersion] }),
    publicRead('predictions'),
  ],
).enableRLS();

export const predictionResults = pgTable(
  'prediction_results',
  {
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    season: text('season').notNull(),
    matchday: smallint('matchday').notNull(),
    modelVersion: text('model_version').notNull(),
    predicted: real('predicted').notNull(),
    actual: smallint('actual').notNull(),
    absError: real('abs_error').notNull(),
    insidePredictionInterval: boolean('inside_prediction_interval').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.playerId, t.season, t.matchday, t.modelVersion] }),
    publicRead('prediction_results'),
  ],
).enableRLS();

/** Remote feature flags / kill switches (e.g. fantasy_provider_enabled). */
export const remoteConfig = pgTable(
  'remote_config',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull(),
    updatedAt: updatedAt(),
  },
  () => [publicRead('remote_config')],
).enableRLS();

/** Ingest observability. RLS on and no policies: only service_role can read/write. */
export const ingestRuns = pgTable(
  'ingest_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    job: text('job').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    status: text('status').notNull(), // running | ok | error
    rows: integer('rows'),
    error: text('error'),
  },
  () => [],
).enableRLS();

// ---------- User data (owner only) ----------

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    /** HMAC of the LALIGA Fantasy user id (never the id itself). */
    providerIdHash: text('provider_id_hash').unique(),
    locale: text('locale').notNull().default('es'),
    createdAt: createdAt(),
  },
  () => ownerAll('users', 'id'),
).enableRLS();

const userRef = () =>
  uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });

export const follows = pgTable(
  'follows',
  {
    userId: userRef(),
    playerId: text('player_id')
      .notNull()
      .references(() => players.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.playerId] }), ...ownerAll('follows')],
).enableRLS();

export const alertRules = pgTable(
  'alert_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: userRef(),
    kind: alertKindEnum('kind').notNull(),
    playerId: text('player_id').references(() => players.id),
    params: jsonb('params').notNull().default({}),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index('alert_rules_user_idx').on(t.userId), ...ownerAll('alert_rules')],
).enableRLS();

export const pushTokens = pgTable(
  'push_tokens',
  {
    token: text('token').primaryKey(),
    userId: userRef(),
    platform: platformEnum('platform').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('push_tokens_user_idx').on(t.userId), ...ownerAll('push_tokens')],
).enableRLS();

/** Premium entitlements. Written only by the server (RevenueCat webhook, Phase 5). */
export const entitlements = pgTable(
  'entitlements',
  {
    userId: userRef(),
    entitlement: text('entitlement').notNull(),
    active: boolean('active').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    source: text('source').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.entitlement] }),
    pgPolicy('entitlements_owner_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = ${authUid}`,
    }),
  ],
).enableRLS();
