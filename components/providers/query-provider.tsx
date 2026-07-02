"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

/**
 * The app-wide React Query client — the shared cache that makes navigation
 * paint instantly from cached data while revalidating in the background.
 *
 * - retry: false — lib/api/client.ts already retries GETs 3× with backoff;
 *   letting React Query retry on top would compound to ~9 attempts.
 * - refetchOnWindowFocus: false — funnel payloads are large; refetching every
 *   tab focus would be a request storm. Hooks opt in where freshness matters.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
