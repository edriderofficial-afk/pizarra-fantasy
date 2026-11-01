import type { Position } from '../domain/schemas';

export type FormationSlots = Readonly<Record<Position, number>>;

/** Parses "4-3-3" into slot counts (always 1 GK). Throws on invalid codes. */
export function parseFormation(code: string): FormationSlots {
  const m = /^([1-6])-([1-6])-([1-6])$/.exec(code);
  if (!m) throw new Error(`Invalid formation: ${code}`);
  const [def, mid, fwd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (def + mid + fwd !== 10) throw new Error(`Formation must have 10 outfield players: ${code}`);
  return { GK: 1, DEF: def, MID: mid, FWD: fwd };
}
