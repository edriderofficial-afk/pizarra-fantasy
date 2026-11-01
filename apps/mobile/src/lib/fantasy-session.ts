import {
  createMemoryTokenStore,
  createSessionManager,
  type SessionStatus,
  type StoredSession,
  type TokenStore,
} from '@pizarra/data';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const KEY = 'laliga_fantasy_session';

/** LALIGA Fantasy token store: device keychain/keystore only. Never sent to our backend (ADR 0003). */
const secureStore: TokenStore = {
  async load() {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      await SecureStore.deleteItemAsync(KEY);
      return null;
    }
  },
  save: (s) => SecureStore.setItemAsync(KEY, JSON.stringify(s)),
  clear: () => SecureStore.deleteItemAsync(KEY),
};

// SecureStore is not available on web (used only for previews): keep it in memory there.
export const fantasySession = createSessionManager({
  store: Platform.OS === 'web' ? createMemoryTokenStore() : secureStore,
  // refresher: filled in Phase 2B from the HAR (token refresh endpoint)
});

let initialised = false;

export function useFantasySessionStatus(): SessionStatus {
  useEffect(() => {
    if (initialised) return;
    initialised = true;
    void fantasySession.init();
  }, []);
  return useSyncExternalStore(
    (onChange) => fantasySession.subscribe(onChange),
    () => fantasySession.status,
  );
}
