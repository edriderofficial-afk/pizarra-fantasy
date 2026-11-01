/**
 * LALIGA Fantasy endpoints.
 *
 * Intentionally EMPTY: the API is not public and we do not guess endpoints.
 * Entries are added in Phase 2 from a HAR captured by the project owner
 * (see scripts/har-to-types.ts), each with a Zod schema for its response.
 */
export interface EndpointDefinition {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
}

export const endpoints: Readonly<Record<string, EndpointDefinition>> = {};
