import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { DataError } from '../provider';
import type { EndpointDefinition } from './endpoints';
import { buildUrl, createHttpClient, type TokenProvider } from './http';

const pub: EndpointDefinition = { method: 'GET', path: '/players/{id}', auth: 'none' };
const priv: EndpointDefinition = { method: 'GET', path: '/me', auth: 'user' };
const Schema = z.object({ ok: z.boolean() });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

function setup(
  responses: (Response | Error)[],
  extra: Partial<Parameters<typeof createHttpClient>[0]> = {},
) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchMock = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  const sleeps: number[] = [];
  let clock = 0;
  const client = createHttpClient({
    baseUrl: 'https://api.example.test/v1',
    fetch: fetchMock as unknown as typeof fetch,
    sleep: (ms) => {
      sleeps.push(ms);
      clock += ms;
      return Promise.resolve();
    },
    now: () => clock,
    random: () => 0.5,
    ...extra,
  });
  return { client, calls, sleeps };
}

describe('buildUrl', () => {
  it('fills path params, encodes them and appends query', () => {
    expect(
      buildUrl('https://x.test/api', pub, { path: { id: 'a b' }, query: { x: 1, y: undefined } }),
    ).toBe('https://x.test/api/players/a%20b?x=1');
  });
  it('fails on missing params', () => {
    expect(() => buildUrl('https://x.test', pub)).toThrow(DataError);
  });
});

describe('createHttpClient', () => {
  it('validates responses with Zod', async () => {
    const { client } = setup([json({ ok: true })]);
    await expect(client.request(pub, Schema, { path: { id: 1 } })).resolves.toEqual({ ok: true });
  });

  it('rejects unexpected shapes without echoing values', async () => {
    const { client } = setup([json({ ok: 'secret-value' })]);
    const err = await client.request(pub, Schema, { path: { id: 1 } }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DataError);
    expect((err as DataError).code).toBe('invalid_response');
    expect((err as DataError).message).not.toContain('secret-value');
  });

  it('rejects non-JSON bodies', async () => {
    const { client } = setup([new Response('<html>', { status: 200 })]);
    await expect(client.request(pub, Schema, { path: { id: 1 } })).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('retries 5xx and network errors with backoff, honouring Retry-After', async () => {
    const { client, sleeps } = setup(
      [new TypeError('net'), json({}, 503, { 'retry-after': '2' }), json({ ok: true })],
      {
        retry: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 5000 },
      },
    );
    await expect(client.request(pub, Schema, { path: { id: 1 } })).resolves.toEqual({ ok: true });
    expect(sleeps).toEqual([50, 2000]);
  });

  it('gives up after maxAttempts', async () => {
    const { client } = setup([json({}, 500), json({}, 500)], {
      retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
    });
    await expect(client.request(pub, Schema, { path: { id: 1 } })).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('fails after repeated network errors', async () => {
    const { client } = setup([new TypeError('a'), new TypeError('b')], {
      retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
    });
    await expect(client.request(pub, Schema, { path: { id: 1 } })).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('maps 404 and other 4xx', async () => {
    const a = setup([json({}, 404)]);
    await expect(a.client.request(pub, Schema, { path: { id: 1 } })).rejects.toMatchObject({
      code: 'not_found',
    });
    const b = setup([json({}, 403)]);
    await expect(b.client.request(pub, Schema, { path: { id: 1 } })).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('caches GETs and de-duplicates in-flight requests', async () => {
    const { client, calls } = setup([json({ ok: true })]);
    const [a, b] = await Promise.all([
      client.request(pub, Schema, { path: { id: 1 } }),
      client.request(pub, Schema, { path: { id: 1 } }),
    ]);
    expect(a).toEqual(b);
    await client.request(pub, Schema, { path: { id: 1 } });
    expect(calls).toHaveLength(1);
    client.clearCache();
    // after clearing, the client goes to the network again (the fake has no responses left)
    await expect(client.request(pub, Schema, { path: { id: 1 } })).rejects.toMatchObject({
      code: 'unavailable',
    });
    expect(calls.length).toBeGreaterThan(1);
  });

  it('rate-limits requests', async () => {
    const { client, sleeps } = setup([json({ ok: true }), json({ ok: true }), json({ ok: true })], {
      rateLimit: { maxRequests: 2, perMs: 1000 },
      cacheTtlMs: 0,
    });
    for (const id of [1, 2, 3]) await client.request(pub, Schema, { path: { id } });
    expect(sleeps).toEqual([1000]);
  });

  it('sends the bearer token and refreshes once on 401', async () => {
    const tokens: TokenProvider = {
      getAccessToken: vi.fn(() => Promise.resolve('t1')),
      refreshAccessToken: vi.fn(() => Promise.resolve('t2')),
    };
    const { client, calls } = setup([json({}, 401), json({ ok: true })], { tokens });
    await expect(client.request(priv, Schema)).resolves.toEqual({ ok: true });
    expect(tokens.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBe('Bearer t1');
  });

  it('reports unauthorized when refresh fails or there is no session', async () => {
    const onUnauthorized = vi.fn();
    const tokens: TokenProvider = {
      getAccessToken: () => Promise.resolve('t1'),
      refreshAccessToken: () => Promise.resolve(null),
    };
    const a = setup([json({}, 401)], { tokens, onUnauthorized });
    await expect(a.client.request(priv, Schema)).rejects.toMatchObject({ code: 'unauthorized' });
    const none: TokenProvider = {
      getAccessToken: () => Promise.resolve(null),
      refreshAccessToken: () => Promise.resolve(null),
    };
    const b = setup([], { tokens: none, onUnauthorized });
    await expect(b.client.request(priv, Schema)).rejects.toMatchObject({ code: 'unauthorized' });
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('never sends Authorization to public endpoints', async () => {
    const tokens: TokenProvider = {
      getAccessToken: () => Promise.resolve('t1'),
      refreshAccessToken: () => Promise.resolve('t2'),
    };
    const { client, calls } = setup([json({ ok: true })], { tokens });
    await client.request(pub, Schema, { path: { id: 1 } });
    expect(new Headers(calls[0]?.init?.headers).has('authorization')).toBe(false);
  });
});
