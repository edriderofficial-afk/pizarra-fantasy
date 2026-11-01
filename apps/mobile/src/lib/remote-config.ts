import { DEFAULT_REMOTE_CONFIG, type RemoteConfig } from '@pizarra/api-client';
import { useQuery } from '@tanstack/react-query';
import { backend } from './backend';

/** Remote flags; safe defaults when there is no backend or it cannot be reached. */
export function useRemoteConfig(): RemoteConfig {
  const { data } = useQuery({
    queryKey: ['remoteConfig'],
    queryFn: () => (backend ? backend.getRemoteConfig() : Promise.resolve(DEFAULT_REMOTE_CONFIG)),
    staleTime: 10 * 60_000,
  });
  return data ?? DEFAULT_REMOTE_CONFIG;
}
