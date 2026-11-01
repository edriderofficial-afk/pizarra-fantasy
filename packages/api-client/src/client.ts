import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { z } from 'zod';
import { DEFAULT_REMOTE_CONFIG, parseRemoteConfig, type RemoteConfig } from './remote-config';

export interface ApiClientOptions {
  readonly url: string;
  readonly anonKey: string;
  /** Session persistence (AsyncStorage on mobile). Supabase sessions only — never LALIGA tokens. */
  readonly storage?: SupportedStorage;
  readonly fetch?: typeof fetch;
}

export interface ApiClient {
  readonly supabase: SupabaseClient;
  /** Signs in anonymously if needed and makes sure the users row exists. Returns the user id. */
  ensureAnonymousSession(): Promise<string>;
  getRemoteConfig(): Promise<RemoteConfig>;
}

const RemoteConfigRows = z.array(z.object({ key: z.string(), value: z.unknown() }));

export function createApiClient(options: ApiClientOptions): ApiClient {
  const supabase = createClient(options.url, options.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...(options.storage ? { storage: options.storage } : {}),
    },
    ...(options.fetch ? { global: { fetch: options.fetch } } : {}),
  });

  return {
    supabase,
    async ensureAnonymousSession() {
      const { data: current } = await supabase.auth.getSession();
      let userId = current.session?.user.id;
      if (!userId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user)
          throw new Error(`Anonymous sign-in failed: ${error?.message ?? 'no user'}`);
        userId = data.user.id;
      }
      const { error } = await supabase
        .from('users')
        .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw new Error(`Could not register user: ${error.message}`);
      return userId;
    },
    async getRemoteConfig() {
      const { data, error } = await supabase.from('remote_config').select('key, value');
      if (error) return DEFAULT_REMOTE_CONFIG;
      const rows = RemoteConfigRows.safeParse(data);
      return rows.success ? parseRemoteConfig(rows.data) : DEFAULT_REMOTE_CONFIG;
    },
  };
}
