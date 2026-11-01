import { z } from 'zod';

/**
 * Season rules, validated with Zod so a new season is a data change, not a code change.
 * Every section carries `verified`: false means "taken from the previous season or a public
 * guide; must be confirmed against official LALIGA Fantasy rules" ([VERIFICAR] in the brief).
 * Unknown values are `null`, never guessed.
 */

const Verified = z.object({
  verified: z.boolean(),
  /** Where the value comes from (official page, previous season, etc.). */
  source: z.string().min(1),
});

const ByPosition = z.object({
  GK: z.number(),
  DEF: z.number(),
  MID: z.number(),
  FWD: z.number(),
});

export const FormationCodeSchema = z.string().regex(/^[1-6]-[1-6]-[1-6]$/);

export const SeasonRulesSchema = z.object({
  season: z.string().regex(/^\d{4}-\d{2}$/),
  competitions: z.array(z.enum(['primera', 'hypermotion'])).min(1),
  squad: Verified.extend({
    initialSize: z.number().int().positive(),
    maxSize: z.number().int().positive().nullable(),
    initialBudget: z.number().int().positive(),
  }),
  lineup: Verified.extend({
    formations: z.array(FormationCodeSchema).min(1),
  }),
  captain: Verified.extend({
    /** Captain is a league Premium feature. */
    requiresLeaguePremium: z.boolean(),
    multiplier: z.number().positive(),
  }),
  algorithmicBonus: Verified.extend({
    min: z.number(),
    max: z.number(),
  }),
  scoring: Verified.extend({
    minutesUnder60: z.number(),
    minutes60Plus: z.number(),
    goal: ByPosition,
    assist: z.number(),
    cleanSheet: ByPosition,
    goalConcededEvery2: ByPosition,
    penaltySaved: z.number(),
    penaltyMissed: z.number(),
    ownGoal: z.number(),
    yellowCard: z.number(),
    secondYellow: z.number(),
    redCard: z.number(),
  }),
  clauses: Verified.extend({
    /** Protection window after signing, in days. null = unknown. */
    protectionDaysAfterSigning: z.number().nonnegative().nullable(),
    shieldEnabled: z.boolean(),
    shieldCost: z.number().nonnegative().nullable(),
    shieldDurationDays: z.number().nonnegative().nullable(),
  }),
  market: Verified.extend({
    negativeBalanceAllowed: z.boolean().nullable(),
    dailyRewardEnabled: z.boolean(),
  }),
});
export type SeasonRules = z.infer<typeof SeasonRulesSchema>;

export function parseSeasonRules(input: unknown): SeasonRules {
  const rules = SeasonRulesSchema.parse(input);
  if (rules.algorithmicBonus.min > rules.algorithmicBonus.max) {
    throw new Error('algorithmicBonus.min must be <= max');
  }
  return rules;
}

/** Sections whose values still need official confirmation. */
export function unverifiedSections(rules: SeasonRules): string[] {
  const sections = [
    'squad',
    'lineup',
    'captain',
    'algorithmicBonus',
    'scoring',
    'clauses',
    'market',
  ] as const;
  return sections.filter((s) => !rules[s].verified);
}
