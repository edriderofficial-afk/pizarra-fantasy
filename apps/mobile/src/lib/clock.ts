import { useEffect, useMemo, useState } from 'react';

/**
 * Current time on the provider's clock. The mock dataset has a fixed "now"; we anchor it to
 * the moment the app started so countdowns tick realistically and stay reproducible.
 */
const appStart = Date.now();

export function useProviderNow(providerNowIso: string | undefined, tickMs = 30_000): number {
  const offset = useMemo(
    () => (providerNowIso ? Date.parse(providerNowIso) - appStart : 0),
    [providerNowIso],
  );
  const [wall, setWall] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setWall(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return wall + offset;
}

export function splitDuration(ms: number): { d: number; h: number; m: number } {
  const total = Math.max(0, Math.floor(ms / 60_000));
  return { d: Math.floor(total / 1440), h: Math.floor((total % 1440) / 60), m: total % 60 };
}
