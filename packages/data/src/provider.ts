/**
 * Data access contract. Every source (mock, LALIGA Fantasy, our own backend)
 * implements this interface; the apps only ever talk to a DataProvider.
 *
 * Phase 0: only the provider identity. Methods (getLeagues, getSquad, getMarket, ...)
 * are added in Phase 1 together with their Zod-validated domain types.
 */
export type DataProviderKind = 'mock' | 'fantasy';

export interface DataProvider {
  readonly kind: DataProviderKind;
}
