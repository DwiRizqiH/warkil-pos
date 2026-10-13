import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401 is not a transient failure: retrying it only delays the guard's redirect.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status === 401) && failureCount < 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
