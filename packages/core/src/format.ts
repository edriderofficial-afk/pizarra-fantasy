/**
 * Formats a price in euros as a compact "millions" string, e.g. 12_345_000 -> "12,3M".
 * Pure and locale-aware (defaults to Spanish).
 */
export function formatMillions(euros: number, locale: string = 'es-ES'): string {
  if (!Number.isFinite(euros)) {
    throw new RangeError(`formatMillions: expected a finite number, got ${euros}`);
  }
  const millions = euros / 1_000_000;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(millions);
  return `${formatted}M`;
}
