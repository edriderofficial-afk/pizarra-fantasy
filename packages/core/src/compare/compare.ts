export type MetricDirection = 'higher' | 'lower';

export interface ComparableRow {
  readonly id: string;
  readonly metrics: Readonly<Record<string, number | null>>;
}

/**
 * For each metric, the ids of the best row(s) (ties allowed). null values never win.
 * Metrics with no numeric values map to an empty array.
 */
export function bestByMetric(
  rows: readonly ComparableRow[],
  directions: Readonly<Record<string, MetricDirection>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [metric, dir] of Object.entries(directions)) {
    let best: number | null = null;
    let ids: string[] = [];
    for (const row of rows) {
      const v = row.metrics[metric];
      if (v === null || v === undefined) continue;
      const better = best === null || (dir === 'higher' ? v > best : v < best);
      if (better) {
        best = v;
        ids = [row.id];
      } else if (v === best) {
        ids.push(row.id);
      }
    }
    out[metric] = ids;
  }
  return out;
}
