import { createTRPCClient, httpBatchLink } from '@trpc/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Simple tRPC client for direct RPC calls.
 * Auth is handled via httpOnly cookies (credentials: 'include').
 */
export const trpcClient = createTRPCClient<any>({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
    }),
  ],
});
