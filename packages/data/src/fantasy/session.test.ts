import { describe, expect, it, vi } from 'vitest';
import { createMemoryTokenStore, createSessionManager, type StoredSession } from './session';

const s = (
  token: string,
  expiresAt: string | null = null,
  refreshToken: string | null = 'r',
): StoredSession => ({
  accessToken: token,
  refreshToken,
  expiresAt,
});

describe('createSessionManager', () => {
  it('starts disconnected without a stored session and connects', async () => {
    const store = createMemoryTokenStore();
    const m = createSessionManager({ store });
    expect(m.status).toBe('unknown');
    expect(await m.init()).toBe('disconnected');
    expect(await m.getAccessToken()).toBeNull();
    await m.connect(s('a'));
    expect(m.status).toBe('connected');
    expect(await store.load()).toEqual(s('a'));
    expect(await m.getAccessToken()).toBe('a');
  });

  it('restores a stored session (survives restarts)', async () => {
    const m = createSessionManager({ store: createMemoryTokenStore(s('saved')) });
    expect(await m.init()).toBe('connected');
    expect(await m.getAccessToken()).toBe('saved');
  });

  it('refreshes proactively before expiry, single-flight', async () => {
    const refresher = vi.fn(() => Promise.resolve(s('new', '2030-01-01T00:00:00Z')));
    const m = createSessionManager({
      store: createMemoryTokenStore(s('old', '2026-01-01T00:00:30Z')),
      refresher,
      now: () => Date.parse('2026-01-01T00:00:00Z'),
    });
    await m.init();
    const [a, b] = await Promise.all([m.getAccessToken(), m.getAccessToken()]);
    expect(a).toBe('new');
    expect(b).toBe('new');
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it('expires and notifies when refresh fails or is impossible', async () => {
    const statuses: string[] = [];
    const m = createSessionManager({
      store: createMemoryTokenStore(s('a')),
      refresher: () => Promise.reject(new Error('nope')),
    });
    const unsubscribe = m.subscribe((x) => statuses.push(x));
    await m.init();
    expect(await m.refreshAccessToken()).toBeNull();
    expect(m.status).toBe('expired');
    unsubscribe();
    const m2 = createSessionManager({ store: createMemoryTokenStore(s('a', null, null)) });
    await m2.init();
    expect(await m2.refreshAccessToken()).toBeNull();
    expect(m2.status).toBe('expired');
    expect(statuses).toEqual(['connected', 'expired']);
  });

  it('disconnect clears the stored token', async () => {
    const store = createMemoryTokenStore(s('a'));
    const m = createSessionManager({ store });
    await m.init();
    await m.disconnect();
    expect(await store.load()).toBeNull();
    expect(m.status).toBe('disconnected');
  });
});
