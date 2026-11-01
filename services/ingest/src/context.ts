import type { CompetitionId } from '@pizarra/core';
import type { DataProvider } from '@pizarra/data';
import type { Database } from '@pizarra/db';

export interface IngestContext {
  readonly db: Database;
  readonly provider: DataProvider;
  readonly competition: CompetitionId;
  readonly season: string;
}

/** Splits rows into batches to keep statements under Postgres parameter limits. */
export function chunk<T>(rows: readonly T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}
