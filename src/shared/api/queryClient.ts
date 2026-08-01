import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (count, error) => error instanceof ApiError && error.httpStatus >= 500 && count < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
