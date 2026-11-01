import type { Position } from '../domain/schemas';
import { POSITIONS } from '../domain/schemas';
import { parseFormation } from '../rules/formations';

export interface LineupCandidate {
  readonly playerId: string;
  readonly position: Position;
  readonly xPts: number;
  /** false = injured/suspended/no fixture: never picked. */
  readonly available: boolean;
}

export interface LineupPlan {
  readonly formation: string;
  /** Starters ordered GK, DEF, MID, FWD; within a line by xPts desc. */
  readonly starters: readonly LineupCandidate[];
  readonly bench: readonly LineupCandidate[];
  readonly captainId: string | null;
  /** Sum of starters' xPts plus the captain's extra points. */
  readonly totalXPts: number;
}

export interface OptimizeOptions {
  readonly formations: readonly string[];
  /** null = no captain (e.g. league without Premium). */
  readonly captainMultiplier: number | null;
  /** Number of alternative plans (other formations) to return. */
  readonly alternatives?: number;
}

export interface OptimizeResult {
  readonly best: LineupPlan | null;
  readonly alternatives: readonly LineupPlan[];
}

const byXPts = (a: LineupCandidate, b: LineupCandidate) =>
  b.xPts - a.xPts || a.playerId.localeCompare(b.playerId);

function captainOf(starters: readonly LineupCandidate[]): LineupCandidate | null {
  return [...starters].sort(byXPts)[0] ?? null;
}

function planFor(
  formation: string,
  pool: ReadonlyMap<Position, readonly LineupCandidate[]>,
  all: readonly LineupCandidate[],
  captainMultiplier: number | null,
): LineupPlan | null {
  const slots = parseFormation(formation);
  const starters: LineupCandidate[] = [];
  for (const pos of POSITIONS) {
    const options = pool.get(pos) ?? [];
    if (options.length < slots[pos]) return null;
    starters.push(...options.slice(0, slots[pos]));
  }
  const ids = new Set(starters.map((s) => s.playerId));
  const captain = captainMultiplier === null ? null : captainOf(starters);
  const base = starters.reduce((a, s) => a + s.xPts, 0);
  const extra = captain && captainMultiplier !== null ? captain.xPts * (captainMultiplier - 1) : 0;
  return {
    formation,
    starters,
    bench: all.filter((c) => !ids.has(c.playerId)).sort(byXPts),
    captainId: captain?.playerId ?? null,
    totalXPts: base + extra,
  };
}

/**
 * Best eleven by exhaustive search over allowed formations. For a fixed formation the
 * optimum is the top-N by xPts in each line, so the search is O(formations · n log n).
 */
export function optimizeLineup(
  candidates: readonly LineupCandidate[],
  options: OptimizeOptions,
): OptimizeResult {
  const pool = new Map<Position, LineupCandidate[]>();
  for (const c of candidates) {
    if (!c.available) continue;
    const arr = pool.get(c.position) ?? [];
    arr.push(c);
    pool.set(c.position, arr);
  }
  for (const arr of pool.values()) arr.sort(byXPts);

  const plans = options.formations
    .map((f) => planFor(f, pool, candidates, options.captainMultiplier))
    .filter((p): p is LineupPlan => p !== null)
    .sort((a, b) => b.totalXPts - a.totalXPts || a.formation.localeCompare(b.formation));

  return {
    best: plans[0] ?? null,
    alternatives: plans.slice(1, 1 + (options.alternatives ?? 3)),
  };
}

/** Expected points of a given eleven (e.g. the user's current lineup). Unknown ids count 0. */
export function evaluateLineup(
  playerIds: readonly string[],
  captainId: string | null,
  xPtsById: ReadonlyMap<string, number>,
  captainMultiplier: number | null,
): number {
  const base = playerIds.reduce((a, id) => a + (xPtsById.get(id) ?? 0), 0);
  if (captainId === null || captainMultiplier === null || !playerIds.includes(captainId))
    return base;
  return base + (xPtsById.get(captainId) ?? 0) * (captainMultiplier - 1);
}
