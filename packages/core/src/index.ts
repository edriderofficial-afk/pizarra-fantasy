export { MODEL_VERSION } from './model-version';
export { formatMillions } from './format';
export * from './domain/schemas';
export * from './rules';
export { clamp, ewma, shrink, stdDev } from './stats/ewma';
export { summarizePlayer, type PlayerSeasonSummary } from './stats/summary';
export {
  computeTeamRatings,
  NEUTRAL_RATING,
  type TeamRating,
  type TeamRatingOptions,
} from './ratings/team-ratings';
export {
  matchDifficulty,
  opponentStrength,
  type DifficultyLevel,
  type DifficultyOptions,
} from './difficulty/difficulty';
export { DEFAULT_XPTS_CONFIG, type XPtsConfig } from './xpts/config';
export {
  expectedPoints,
  type FixtureContext,
  type XPtsInput,
  type XPtsReason,
  type XPtsReasonCode,
  type XPtsResult,
} from './xpts/xpts';
export {
  projectMatchday,
  upcomingFixtures,
  type FixtureOutlook,
  type PlayerProjection,
  type ProjectionInput,
} from './projection/projection';
export {
  evaluateLineup,
  optimizeLineup,
  type LineupCandidate,
  type LineupPlan,
  type OptimizeOptions,
  type OptimizeResult,
} from './optimizer/lineup';
export { bestByMetric, type ComparableRow, type MetricDirection } from './compare/compare';
