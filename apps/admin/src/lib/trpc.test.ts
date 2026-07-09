import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('trpcCall - category.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call POST /trpc/category.delete with id in body (no token param)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { data: { success: true } } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Import dynamically to use the mocked fetch
    const { trpcCall } = await import('./trpc');

    const result = await trpcCall('category.delete', { id: 'test-123' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/trpc/category.delete',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'test-123' }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('should fail at type level if called with 3 arguments (token param)', async () => {
    // This test verifies the signature — trpcCall only takes (path, input?)
    // If someone passes a 3rd argument like `token`, TypeScript would flag it
    // At runtime, the extra arg is ignored, but this tests the correct invocation pattern
    const { trpcCall } = await import('./trpc') as { trpcCall: (path: string, input?: unknown) => Promise<unknown> };
    expect(typeof trpcCall).toBe('function');
    expect(trpcCall.length).toBe(2); // 2 formal parameters in function signature
  });
});
