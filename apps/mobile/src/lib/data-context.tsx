import { createMockProvider, type DataProvider, endpoints } from '@pizarra/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { backend } from './backend';

const DataContext = createContext<DataProvider | null>(null);

/** true once Phase 2B has mapped LALIGA Fantasy endpoints from the HAR. */
export const FANTASY_PROVIDER_AVAILABLE = Object.keys(endpoints).length > 0;

function createProvider(): DataProvider {
  // Phase 2A: always mock. In 2B the FantasyProvider is used when FANTASY_PROVIDER_AVAILABLE,
  // the remote flag is on and the user has connected their account.
  return createMockProvider();
}

export function DataRoot({ children }: { children: ReactNode }) {
  const [provider] = useState(createProvider);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1 } },
      }),
  );
  useEffect(() => {
    // Anonymous Pizarra account (no personal data). Failures are non-blocking: the app works offline.
    backend?.ensureAnonymousSession().catch((e: unknown) => {
      console.warn('[backend] anonymous session unavailable', e);
    });
  }, []);
  return (
    <DataContext.Provider value={provider}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </DataContext.Provider>
  );
}

export function useDataProvider(): DataProvider {
  const p = useContext(DataContext);
  if (!p) throw new Error('useDataProvider must be used inside <DataRoot>');
  return p;
}
