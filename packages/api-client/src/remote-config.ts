import { z } from 'zod';

/**
 * Remote flags (table remote_config). Unknown keys are ignored and missing or invalid values fall
 * back to safe defaults, so a bad row can never enable the unofficial provider by accident.
 */
export const RemoteConfigSchema = z.object({
  fantasyProviderEnabled: z.boolean(),
});
export type RemoteConfig = z.infer<typeof RemoteConfigSchema>;

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = { fantasyProviderEnabled: false };

const KEYS: Record<string, keyof RemoteConfig> = {
  fantasy_provider_enabled: 'fantasyProviderEnabled',
};

export function parseRemoteConfig(rows: readonly { key: string; value: unknown }[]): RemoteConfig {
  const merged: Record<string, unknown> = { ...DEFAULT_REMOTE_CONFIG };
  for (const row of rows) {
    const field = KEYS[row.key];
    if (!field) continue;
    const candidate = { ...merged, [field]: row.value };
    if (RemoteConfigSchema.safeParse(candidate).success) merged[field] = row.value;
  }
  return RemoteConfigSchema.parse(merged);
}
