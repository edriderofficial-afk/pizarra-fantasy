/**
 * Exponentially weighted mean of a series ordered oldest -> newest.
 * `halfLife` = number of observations after which a weight halves.
 * Optional `sampleWeights` scale each observation (e.g. by minutes played).
 * Returns null for an empty series (or all-zero weights).
 */
export function ewma(
  values: readonly number[],
  halfLife: number,
  sampleWeights?: readonly number[],
): number | null {
  if (halfLife <= 0) throw new RangeError('halfLife must be > 0');
  if (sampleWeights && sampleWeights.length !== values.length) {
    throw new RangeError('sampleWeights must match values length');
  }
  if (values.length === 0) return null;
  const decay = 0.5 ** (1 / halfLife);
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const w = decay ** (values.length - 1 - i) * (sampleWeights ? (sampleWeights[i] as number) : 1);
    weighted += w * (values[i] as number);
    total += w;
  }
  return total > 0 ? weighted / total : null;
}

/** Sample standard deviation; null with fewer than 2 values. */
export function stdDev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Bayesian-style shrinkage of an observed mean toward a prior with `k` pseudo-observations. */
export function shrink(observed: number | null, n: number, prior: number, k: number): number {
  if (observed === null || n <= 0) return prior;
  return (n * observed + k * prior) / (n + k);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
