import { createApiClient, type ApiClient } from '@pizarra/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Our backend (Supabase). null when not configured: the app keeps working fully offline on mocks.
 * Only the Supabase session is persisted here; LALIGA tokens live in SecureStore (fantasy-session).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const backend: ApiClient | null =
  url && anonKey ? createApiClient({ url, anonKey, storage: AsyncStorage }) : null;
