import type { TokenProvider } from './http';

/**
 * LALIGA Fantasy session, kept ONLY on the device (ADR 0003). The store is implemented by the
 * app with expo-secure-store; nothing here ever talks to our backend.
 */
export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  /** ISO instant; null if unknown. */
  readonly expiresAt: string | null;
}

export interface TokenStore {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

/** Exchanges a refresh token for a new session (filled in Phase 2B from the HAR). */
export type SessionRefresher = (refreshToken: string) => Promise<StoredSession>;

export type SessionStatus = 'unknown' | 'disconnected' | 'connected' | 'expired';

export interface SessionManager extends TokenProvider {
  readonly status: SessionStatus;
  /** Loads the stored session (call once at app start). */
  init(): Promise<SessionStatus>;
  connect(session: StoredSession): Promise<void>;
  disconnect(): Promise<void>;
  /** Marks the session expired (e.g. after an unrecoverable 401). */
  expire(): Promise<void>;
  subscribe(listener: (status: SessionStatus) => void): () => void;
}

export interface SessionManagerOptions {
  readonly store: TokenStore;
  readonly refresher?: SessionRefresher;
  /** Refresh this long before expiry. */
  readonly refreshSkewMs?: number;
  readonly now?: () => number;
}

export function createSessionManager(options: SessionManagerOptions): SessionManager {
  const now = options.now ?? Date.now;
  const skew = options.refreshSkewMs ?? 60_000;
  const listeners = new Set<(s: SessionStatus) => void>();
  let session: StoredSession | null = null;
  let status: SessionStatus = 'unknown';
  let refreshing: Promise<string | null> | null = null;

  const setStatus = (s: SessionStatus) => {
    if (s === status) return;
    status = s;
    for (const l of listeners) l(s);
  };

  async function doRefresh(): Promise<string | null> {
    const refreshToken = session?.refreshToken;
    if (!refreshToken || !options.refresher) {
      await manager.expire();
      return null;
    }
    try {
      const next = await options.refresher(refreshToken);
      session = next;
      await options.store.save(next);
      setStatus('connected');
      return next.accessToken;
    } catch {
      await manager.expire();
      return null;
    }
  }

  const manager: SessionManager = {
    get status() {
      return status;
    },
    async init() {
      session = await options.store.load();
      setStatus(session ? 'connected' : 'disconnected');
      return status;
    },
    async connect(next) {
      session = next;
      await options.store.save(next);
      setStatus('connected');
    },
    async disconnect() {
      session = null;
      await options.store.clear();
      setStatus('disconnected');
    },
    async expire() {
      session = null;
      await options.store.clear();
      setStatus('expired');
    },
    async getAccessToken() {
      if (!session) return null;
      const expiresAt = session.expiresAt
        ? Date.parse(session.expiresAt)
        : Number.POSITIVE_INFINITY;
      if (expiresAt - skew > now()) return session.accessToken;
      return manager.refreshAccessToken();
    },
    refreshAccessToken() {
      // single-flight: concurrent 401s share one refresh
      refreshing ??= doRefresh().finally(() => {
        refreshing = null;
      });
      return refreshing;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return manager;
}

/** In-memory store (tests, web preview). */
export function createMemoryTokenStore(initial: StoredSession | null = null): TokenStore {
  let value = initial;
  return {
    load: () => Promise.resolve(value),
    save: (s) => {
      value = s;
      return Promise.resolve();
    },
    clear: () => {
      value = null;
      return Promise.resolve();
    },
  };
}
