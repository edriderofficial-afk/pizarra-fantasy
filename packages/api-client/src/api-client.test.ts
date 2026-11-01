import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { DEFAULT_REMOTE_CONFIG, parseRemoteConfig } from './remote-config';

describe('parseRemoteConfig', () => {
  it('defaults to the provider disabled', () => {
    expect(parseRemoteConfig([])).toEqual(DEFAULT_REMOTE_CONFIG);
  });
  it('reads known keys and ignores unknown or invalid ones', () => {
    expect(
      parseRemoteConfig([
        { key: 'fantasy_provider_enabled', value: true },
        { key: 'other', value: 1 },
      ]),
    ).toEqual({
      fantasyProviderEnabled: true,
    });
    expect(parseRemoteConfig([{ key: 'fantasy_provider_enabled', value: 'yes' }])).toEqual(
      DEFAULT_REMOTE_CONFIG,
    );
  });
});

/** Minimal fake of the Supabase REST + Auth endpoints used by the client. */
function fakeSupabase(
  opts: { remoteConfig?: unknown; remoteStatus?: number; signupStatus?: number } = {},
) {
  const calls: string[] = [];
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    is_anonymous: true,
  };
  const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
    const reply = (status: number, body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.pathname === '/auth/v1/signup') {
      if ((opts.signupStatus ?? 200) !== 200)
        return reply(opts.signupStatus ?? 500, { msg: 'disabled' });
      return reply(200, {
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
        token_type: 'bearer',
        user,
      });
    }
    if (url.pathname === '/rest/v1/users') return reply(201, []);
    if (url.pathname === '/rest/v1/remote_config')
      return reply(opts.remoteStatus ?? 200, opts.remoteConfig ?? []);
    return reply(404, {});
  });
  const memory = new Map<string, string>();
  const client = createApiClient({
    url: 'https://project.supabase.test',
    anonKey: 'anon-key',
    fetch: fetchMock as unknown as typeof fetch,
    storage: {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    },
  });
  return { client, calls };
}

describe('createApiClient', () => {
  it('signs in anonymously once and registers the user row', async () => {
    const { client, calls } = fakeSupabase();
    await expect(client.ensureAnonymousSession()).resolves.toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    await client.ensureAnonymousSession();
    expect(calls.filter((c) => c === 'POST /auth/v1/signup')).toHaveLength(1);
    expect(calls).toContain('POST /rest/v1/users');
  });

  it('surfaces sign-in failures', async () => {
    const { client } = fakeSupabase({ signupStatus: 422 });
    await expect(client.ensureAnonymousSession()).rejects.toThrow(/Anonymous sign-in failed/);
  });

  it('reads remote config and falls back to safe defaults on errors', async () => {
    const ok = fakeSupabase({ remoteConfig: [{ key: 'fantasy_provider_enabled', value: true }] });
    await expect(ok.client.getRemoteConfig()).resolves.toEqual({ fantasyProviderEnabled: true });
    const failing = fakeSupabase({ remoteStatus: 500, remoteConfig: { message: 'down' } });
    await expect(failing.client.getRemoteConfig()).resolves.toEqual(DEFAULT_REMOTE_CONFIG);
    const garbage = fakeSupabase({ remoteConfig: [{ nope: 1 }] });
    await expect(garbage.client.getRemoteConfig()).resolves.toEqual(DEFAULT_REMOTE_CONFIG);
  });
});
