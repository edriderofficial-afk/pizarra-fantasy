import { parseSeasonRules } from './schema';

/**
 * LALIGA Fantasy 2026/27.
 *
 * Confirmed by official sources (see docs/BRIEF.md §2): Hypermotion joins the game,
 * 0–4 algorithmic bonus per player and matchday, Daily Reward and Shield are kept.
 * Everything else is [VERIFICAR]: copied from 2025/26 or public guides and flagged
 * `verified: false` until confirmed. Unknown values are null.
 */
export const season202627 = parseSeasonRules({
  season: '2026-27',
  competitions: ['primera', 'hypermotion'],
  squad: {
    verified: false,
    source: '2025/26 values (brief §2)',
    initialSize: 14,
    maxSize: null,
    initialBudget: 100_000_000,
  },
  lineup: {
    verified: false,
    source: 'Common formations in 2025/26; confirm the official list',
    formations: ['3-4-3', '3-5-2', '4-3-3', '4-4-2', '4-5-1', '5-3-2', '5-4-1'],
  },
  captain: {
    verified: false,
    source: 'Brief §2 (league Premium feature); multiplier unconfirmed',
    requiresLeaguePremium: true,
    multiplier: 2,
  },
  algorithmicBonus: {
    verified: true,
    source: 'Official: 0–4 extra points per matchday since 2024/25',
    min: 0,
    max: 4,
  },
  scoring: {
    verified: false,
    source: 'Placeholder table approximating 2025/26; NOT official. Not used by xPts v1',
    minutesUnder60: 1,
    minutes60Plus: 2,
    goal: { GK: 10, DEF: 6, MID: 5, FWD: 4 },
    assist: 3,
    cleanSheet: { GK: 4, DEF: 3, MID: 1, FWD: 0 },
    goalConcededEvery2: { GK: -2, DEF: -1, MID: 0, FWD: 0 },
    penaltySaved: 5,
    penaltyMissed: -2,
    ownGoal: -2,
    yellowCard: -1,
    secondYellow: -2,
    redCard: -3,
  },
  clauses: {
    verified: false,
    source: 'Shield confirmed for 2026/27; formula, costs and windows unknown',
    protectionDaysAfterSigning: null,
    shieldEnabled: true,
    shieldCost: null,
    shieldDurationDays: null,
  },
  market: {
    verified: false,
    source: 'Daily Reward confirmed for 2026/27; negative-balance rules unknown',
    negativeBalanceAllowed: null,
    dailyRewardEnabled: true,
  },
});

export const currentSeasonRules = season202627;
