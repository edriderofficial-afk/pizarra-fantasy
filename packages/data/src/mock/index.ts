import type { DataProvider } from '../provider';

/** Offline provider backed by JSON fixtures. Fixtures arrive in Phase 1. */
export function createMockProvider(): DataProvider {
  return { kind: 'mock' };
}
