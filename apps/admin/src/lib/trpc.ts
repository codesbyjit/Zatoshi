/**
 * tRPC client wrapper.
 * Uses a simple fetch-based approach with httpOnly cookie auth.
 *
 * In tRPC v10:
 *   - Queries (`.query()`) must be called via HTTP GET with JSON-encoded `input` query param.
 *   - Mutations (`.mutation()`) must be called via HTTP POST with JSON body.
 *
 * Auth is handled via httpOnly cookies (credentials: 'include').
 */

export async function trpcCall<T = unknown>(
  path: string,
  input?: unknown,
): Promise<T> {
  // Always use POST for mutations; use GET for queries
  // The caller specifies method via the suffix: "GET:" prefix = GET, otherwise POST
  const useGet = path.startsWith('GET:');
  const cleanPath = useGet ? path.slice(4) : path;

  let res: Response;

  if (useGet) {
    // GET request — encode input as JSON query parameter
    const params = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : '';
    res = await fetch(`http://localhost:3001/trpc/${cleanPath}${params}`, {
      method: 'GET',
      credentials: 'include',
    });
  } else {
    // POST request — send input as JSON body
    res = await fetch(`http://localhost:3001/trpc/${cleanPath}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: input ? JSON.stringify(input) : undefined,
    });
  }

  const data = await res.json();

  // tRPC returns HTTP 200 even for application errors — check the error field
  if (!res.ok || data?.error) {
    const message =
      data?.error?.message || data?.error || (res.ok ? 'tRPC error' : `HTTP ${res.status}`);
    throw new Error(message);
  }

  return data?.result?.data as T;
}

export function getTRPCClient() {
  return {
    query: <T = unknown>(path: string, input?: unknown) =>
      trpcCall<T>(`GET:${path}`, input),
    mutate: <T = unknown>(path: string, input?: unknown) =>
      trpcCall<T>(path, input),
  };
}
