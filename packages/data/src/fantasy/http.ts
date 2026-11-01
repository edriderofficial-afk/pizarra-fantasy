import type { z } from 'zod';
import { DataError } from '../provider';
import type { EndpointDefinition } from './endpoints';

/** Supplies (and refreshes) the user's access token. Implemented by the SessionManager. */
export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
  /** Called once per request after a 401. Returns a new token or null if the session is gone. */
  refreshAccessToken(): Promise<string | null>;
}

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly tokens?: TokenProvider;
  readonly fetch?: typeof fetch;
  /** At most `maxRequests` per `perMs` window (be gentle with an unofficial API). */
  readonly rateLimit?: { readonly maxRequests: number; readonly perMs: number };
  readonly retry?: {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
  };
  /** GET responses are cached in memory for this long. 0 disables the cache. */
  readonly cacheTtlMs?: number;
  readonly timeoutMs?: number;
  readonly headers?: Readonly<Record<string, string>>;
  /** Invoked when a request fails with an unrecoverable 401 (show "reconnect account"). */
  readonly onUnauthorized?: () => void;
  // Injectable for tests
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
}

export interface RequestParams {
  readonly path?: Readonly<Record<string, string | number>>;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
}

export interface HttpClient {
  request<S extends z.ZodType>(
    endpoint: EndpointDefinition,
    schema: S,
    params?: RequestParams,
  ): Promise<z.infer<S>>;
  clearCache(): void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function buildUrl(
  baseUrl: string,
  endpoint: EndpointDefinition,
  params: RequestParams = {},
): string {
  const path = endpoint.path.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params.path?.[key];
    if (v === undefined)
      throw new DataError('invalid_response', `Missing path param "${key}" for ${endpoint.path}`);
    return encodeURIComponent(String(v));
  });
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [k, v] of Object.entries(params.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/** Summarises Zod issues without echoing response values (they may contain personal data). */
function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join('.') || '<root>'}: ${i.code}`)
    .join('; ');
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const retry = options.retry ?? { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 8_000 };
  const ttl = options.cacheTtlMs ?? 60_000;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const cache = new Map<string, { expires: number; value: unknown }>();
  const inFlight = new Map<string, Promise<unknown>>();
  const sent: number[] = [];

  async function throttle() {
    const limit = options.rateLimit;
    if (!limit) return;
    for (;;) {
      const t = now();
      while (sent.length > 0 && (sent[0] as number) <= t - limit.perMs) sent.shift();
      if (sent.length < limit.maxRequests) {
        sent.push(t);
        return;
      }
      await sleep((sent[0] as number) + limit.perMs - t);
    }
  }

  function backoff(attempt: number, retryAfter: string | null): number {
    const seconds = retryAfter === null ? Number.NaN : Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, retry.maxDelayMs);
    const cap = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** attempt);
    return Math.floor(random() * cap); // full jitter
  }

  async function send(url: string, endpoint: EndpointDefinition): Promise<unknown> {
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      await throttle();
      const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
      if (endpoint.auth === 'user') {
        const token = await options.tokens?.getAccessToken();
        if (!token) {
          options.onUnauthorized?.();
          throw new DataError('unauthorized', 'No LALIGA Fantasy session');
        }
        headers.Authorization = `Bearer ${token}`;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await doFetch(url, { method: endpoint.method, headers, signal: controller.signal });
      } catch {
        clearTimeout(timer);
        if (attempt + 1 < retry.maxAttempts) {
          await sleep(backoff(attempt, null));
          continue;
        }
        throw new DataError('unavailable', `Network error calling ${endpoint.path}`);
      }
      clearTimeout(timer);

      if (res.status === 401 && endpoint.auth === 'user') {
        if (!refreshed && options.tokens) {
          refreshed = true;
          const next = await options.tokens.refreshAccessToken();
          if (next) {
            attempt--; // a refresh does not consume a retry
            continue;
          }
        }
        options.onUnauthorized?.();
        throw new DataError('unauthorized', 'LALIGA Fantasy session expired');
      }
      if (isRetryableStatus(res.status) && attempt + 1 < retry.maxAttempts) {
        await sleep(backoff(attempt, res.headers.get('retry-after')));
        continue;
      }
      if (res.status === 404) throw new DataError('not_found', `${endpoint.path} returned 404`);
      if (!res.ok) throw new DataError('unavailable', `${endpoint.path} returned ${res.status}`);
      try {
        return (await res.json()) as unknown;
      } catch {
        throw new DataError('invalid_response', `${endpoint.path} did not return JSON`);
      }
    }
  }

  return {
    async request(endpoint, schema, params) {
      const url = buildUrl(options.baseUrl, endpoint, params);
      const cacheable = endpoint.method === 'GET' && ttl > 0;
      const key = `${endpoint.auth}:${url}`;
      if (cacheable) {
        const hit = cache.get(key);
        if (hit && hit.expires > now()) return hit.value as z.infer<typeof schema>;
      }
      let pending = cacheable ? inFlight.get(key) : undefined;
      if (!pending) {
        pending = send(url, endpoint);
        if (cacheable) inFlight.set(key, pending);
      }
      let raw: unknown;
      try {
        raw = await pending;
      } finally {
        inFlight.delete(key);
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new DataError(
          'invalid_response',
          `${endpoint.path}: unexpected shape (${describeIssues(parsed.error)})`,
        );
      }
      if (cacheable) cache.set(key, { expires: now() + ttl, value: parsed.data });
      return parsed.data;
    },
    clearCache() {
      cache.clear();
    },
  };
}
