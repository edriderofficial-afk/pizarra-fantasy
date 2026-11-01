import { createMockProvider, type DataProvider } from '@pizarra/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useState } from 'react';

const DataContext = createContext<DataProvider | null>(null);

function createProvider(): DataProvider {
  // Phase 1: mock only. The fantasy provider is wired in Phase 2 behind a remote flag.
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
