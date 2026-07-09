import { randomUUID } from 'node:crypto';
const API_BASE = 'http://localhost:3001/trpc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';
const CUSTOMER_EMAIL = 'customer@example.com';
const CUSTOMER_PASSWORD = 'customer123';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10_000;
const SERVER_DOWN_RETRY_WAIT = 10_000;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OperationConfig {
  type: string;
  weight: number;
  auth: 'admin' | 'customer' | 'none';
}

interface OperationStats {
  type: string;
  total: number;
  ok: number;
  fail: number;
}

interface ProductInfo {
  id: string;
  slug: string;
}

interface CategoryInfo {
  id: string;
}

interface AppState {
  adminCookies: string;
  customerCookies: string;
  /** IDs fetched from the API on init */
  knownProducts: ProductInfo[];
  knownCategories: CategoryInfo[];
  /** Mutex-style guard to serialise init */
  initialized: boolean;
  initializing: boolean;
}

type AuthMode = 'admin' | 'customer' | 'none';

// ─────────────────────────────────────────────────────────────
// CLI Arguments
// ─────────────────────────────────────────────────────────────

function parseArgs(): {
  delay: number;
  count: number;
  concurrency: number;
} {
  const args = process.argv.slice(2);
  const opts = { delay: 0, count: Infinity, concurrency: 1 };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--delay':
        opts.delay = Number(args[++i]) || 0;
        break;
      case '--count':
        opts.count = Number(args[++i]) || Infinity;
        break;
      case '--concurrency':
        opts.concurrency = Math.max(1, Number(args[++i]) || 1);
        break;
    }
  }

  return opts;
}

// ─────────────────────────────────────────────────────────────
// Logging & Colors
// ─────────────────────────────────────────────────────────────

const Colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', 'T').slice(0, 19);
}

function colorStatus(status: 'OK' | 'ERROR' | 'SKIP' | 'RETRY'): string {
  switch (status) {
    case 'OK':
      return `${Colors.green}OK${Colors.reset}`;
    case 'ERROR':
      return `${Colors.red}ERROR${Colors.reset}`;
    case 'SKIP':
      return `${Colors.yellow}SKIP${Colors.reset}`;
    case 'RETRY':
      return `${Colors.cyan}RETRY${Colors.reset}`;
  }
}

function logOperation(
  type: string,
  detail: string,
  status: 'OK' | 'ERROR' | 'SKIP' | 'RETRY',
  extra?: string,
): void {
  const extraStr = extra ? ` ${Colors.dim}${extra}${Colors.reset}` : '';
  console.log(
    `[${timestamp()}] ${type.padEnd(18)} ${detail.padEnd(55)} ${colorStatus(status)}${extraStr}`,
  );
}

// ─────────────────────────────────────────────────────────────
// tRPC Client Helpers
// ─────────────────────────────────────────────────────────────

/** tRPC v10 HTTP: encode a query procedure's input as a URL param. */
function encodeQueryInput(input: unknown): string {
  return encodeURIComponent(JSON.stringify(input));
}

/**
 * Parse a tRPC v10 response.
 * Returns { ok: true, data } or { ok: false, error }.
 */
function parseTRPCResponse(body: string): { ok: true; data: unknown } | { ok: false; error: string; code?: string } {
  try {
    const parsed = JSON.parse(body);

    // tRPC wraps success in { result: { data: ... } }
    if (parsed.result && parsed.result.data !== undefined) {
      return { ok: true, data: parsed.result.data };
    }

    // tRPC wraps errors in { error: { message: "...", code: "..." } }
    if (parsed.error) {
      return {
        ok: false,
        error: parsed.error.message ?? 'Unknown tRPC error',
        code: parsed.error.code ?? parsed.error.data?.code,
      };
    }

    return { ok: false, error: `Unexpected response shape: ${body.slice(0, 200)}` };
  } catch {
    return { ok: false, error: `Invalid JSON response: ${body.slice(0, 200)}` };
  }
}

/**
 * Make a request to the API with retry logic.
 * Returns parsed tRPC response or throws if server is unreachable.
 */
async function apiCall(
  path: string,
  method: 'GET' | 'POST',
  cookies: string,
  body?: unknown,
): Promise<{ ok: true; data: unknown; status: number } | { ok: false; error: string; code?: string; status: number }> {
  const url = method === 'GET' && body
    ? `${API_BASE}/${path}?input=${encodeQueryInput(body)}`
    : `${API_BASE}/${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: method === 'POST' && body ? JSON.stringify(body) : undefined,
        // include credentials so Set-Cookie works if needed
      });

      const text = await resp.text();
      const parsed = parseTRPCResponse(text);

      if (parsed.ok) {
        return { ok: true, data: parsed.data, status: resp.status };
      }

      // tRPC errors come as HTTP 200 with error in body
      return { ok: false, error: parsed.error, code: parsed.code, status: resp.status };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        logOperation('SYSTEM', `Retry ${attempt}/${MAX_RETRIES} for ${path}`, 'RETRY', lastError.message);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `Server unreachable after ${MAX_RETRIES} retries: ${lastError?.message ?? 'unknown error'}`,
  );
}

/**
 * For GET queries without input body.
 */
async function apiQueryGET(
  path: string,
  cookies: string,
): Promise<{ ok: true; data: unknown; status: number } | { ok: false; error: string; code?: string; status: number }> {
  const url = `${API_BASE}/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      const text = await resp.text();
      const parsed = parseTRPCResponse(text);

      if (parsed.ok) {
        return { ok: true, data: parsed.data, status: resp.status };
      }

      return { ok: false, error: parsed.error, code: parsed.code, status: resp.status };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        logOperation('SYSTEM', `Retry ${attempt}/${MAX_RETRIES} for ${path}`, 'RETRY', lastError.message);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `Server unreachable after ${MAX_RETRIES} retries: ${lastError?.message ?? 'unknown error'}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a random email for registration. */
function randomEmail(): string {
  return `loadtest-${Date.now()}-${randomInt(1000, 9999)}@test.example`;
}

/** Generate a random product slug. */
function randomSlug(): string {
  return `loadtest-${randomUUID().slice(0, 8)}`;
}

/** Generate a random product name. */
function randomProductName(): string {
  const adjectives = ['Premium', 'Eco', 'Smart', 'Ultra', 'Classic', 'Modern', 'Luxury', 'Basic'];
  const nouns = ['Widget', 'Gadget', 'Device', 'Tool', 'Kit', 'Bundle', 'Pack', 'Set'];
  return `${pickRandom(adjectives)} ${pickRandom(nouns)} ${randomInt(100, 999)}`;
}

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

const state: AppState = {
  adminCookies: '',
  customerCookies: '',
  knownProducts: [],
  knownCategories: [],
  initialized: false,
  initializing: false,
};

const stats = new Map<string, OperationStats>();

function recordStat(type: string, ok: boolean): void {
  let s = stats.get(type);
  if (!s) {
    s = { type, total: 0, ok: 0, fail: 0 };
    stats.set(type, s);
  }
  s.total++;
  if (ok) s.ok++;
  else s.fail++;
}

// ─────────────────────────────────────────────────────────────
// Auth / Cookie Management
// ─────────────────────────────────────────────────────────────

/**
 * Log in and return a cookies string.
 */
async function doLogin(email: string, password: string): Promise<string> {
  const resp = await apiCall('auth.login', 'POST', '', { email, password });

  if (!resp.ok) {
    throw new Error(`Login failed for ${email}: ${resp.error}`);
  }

  const data = resp.data as { tokens?: { accessToken?: string; refreshToken?: string } };
  const tokens = data?.tokens;
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error(`Login response missing tokens for ${email}`);
  }

  return `accessToken=${tokens.accessToken}; refreshToken=${tokens.refreshToken}`;
}

async function ensureAdminAuth(): Promise<string> {
  if (!state.adminCookies) {
    state.adminCookies = await doLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
  }
  return state.adminCookies;
}

async function ensureCustomerAuth(): Promise<string> {
  if (!state.customerCookies) {
    state.customerCookies = await doLogin(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  }
  return state.customerCookies;
}

/** Re-login as admin (e.g., after 401). */
async function refreshAdminAuth(): Promise<string> {
  state.adminCookies = await doLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
  return state.adminCookies;
}

/** Re-login as customer (e.g., after 401). */
async function refreshCustomerAuth(): Promise<string> {
  state.customerCookies = await doLogin(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
  return state.customerCookies;
}

// ─────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────

async function initialize(): Promise<void> {
  if (state.initialized || state.initializing) return;
  state.initializing = true;

  try {
    logOperation('INIT', 'Logging in as admin...', 'OK');
    state.adminCookies = await doLogin(ADMIN_EMAIL, ADMIN_PASSWORD);

    logOperation('INIT', 'Logging in as customer...', 'OK');
    state.customerCookies = await doLogin(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);

    // Fetch existing categories (public endpoint)
    try {
      const catResp = await apiQueryGET('category.list', '');
      if (catResp.ok) {
        const cats = catResp.data as Array<{ _id: string }>;
        state.knownCategories = (cats ?? []).map((c) => ({ id: c._id }));
        logOperation('INIT', `Loaded ${state.knownCategories.length} categories`, 'OK');
      }
    } catch {
      logOperation('INIT', 'Could not load categories (will create products without category)', 'SKIP');
    }

    // Fetch existing products (public endpoint)
    try {
      const prodResp = await apiCall('product.list', 'GET', '', { page: 1, limit: 20 });
      if (prodResp.ok) {
        const data = prodResp.data as { items?: Array<{ _id: string; slug: string }> };
        const items = data?.items ?? [];
        state.knownProducts = items.map((p) => ({ id: p._id, slug: p.slug }));
        logOperation('INIT', `Loaded ${state.knownProducts.length} products`, 'OK');
      }
    } catch {
      logOperation('INIT', 'Could not load products', 'SKIP');
    }

    state.initialized = true;
    logOperation('INIT', 'Initialization complete', 'OK');
  } catch (err) {
    logOperation('INIT', `Initialization failed: ${err}`, 'ERROR');
    throw err;
  } finally {
    state.initializing = false;
  }
}

// ─────────────────────────────────────────────────────────────
// Operation Implementations
// ─────────────────────────────────────────────────────────────

async function opListProducts(): Promise<void> {
  const page = randomInt(1, 5);
  const limit = randomInt(5, 20);
  const resp = await apiCall('product.list', 'GET', '', { page, limit });

  if (resp.ok) {
    const data = resp.data as { items?: unknown[] };
    const count = data?.items?.length ?? 0;

    // Seed known products from the listing
    if (data?.items && state.knownProducts.length < 50) {
      const items = data.items as Array<{ _id: string; slug: string }>;
      for (const p of items) {
        if (p._id && !state.knownProducts.some((k) => k.id === p._id)) {
          state.knownProducts.push({ id: p._id, slug: p.slug });
        }
      }
    }

    logOperation('LIST_PRODUCTS', `page=${page} limit=${limit} got ${count} items`, 'OK');
    recordStat('LIST_PRODUCTS', true);
  } else {
    logOperation('LIST_PRODUCTS', `page=${page} → ${resp.error}`, 'ERROR');
    recordStat('LIST_PRODUCTS', false);
  }
}

async function opLogin(): Promise<void> {
  // Cycle through known accounts
  const account = Math.random() < 0.5
    ? { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, label: 'admin' }
    : { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, label: 'customer' };

  try {
    const cookies = await doLogin(account.email, account.password);
    if (account.label === 'admin') {
      state.adminCookies = cookies;
    } else {
      state.customerCookies = cookies;
    }
    logOperation('LOGIN', `${account.email}`, 'OK');
    recordStat('LOGIN', true);
  } catch (err) {
    logOperation('LOGIN', `${account.email} → ${err}`, 'ERROR');
    recordStat('LOGIN', false);
  }
}

async function opCreateUser(): Promise<void> {
  const email = randomEmail();
  const password = `Pass_${randomInt(100000, 999999)}`;
  const name = `LoadTest User ${randomInt(1, 9999)}`;

  const resp = await apiCall('auth.register', 'POST', '', {
    email,
    password,
    name,
  });

  if (resp.ok) {
    logOperation('CREATE_USER', `${email}`, 'OK');
    recordStat('CREATE_USER', true);
  } else if (resp.code === 'CONFLICT') {
    logOperation('CREATE_USER', `${email} → ${resp.error}`, 'SKIP');
    recordStat('CREATE_USER', true); // expected conflict — not a real failure
  } else {
    logOperation('CREATE_USER', `${email} → ${resp.error}`, 'ERROR');
    recordStat('CREATE_USER', false);
  }
}

async function opCreateProduct(): Promise<void> {
  const cookies = await ensureAdminAuth();
  const catId = state.knownCategories.length > 0
    ? pickRandom(state.knownCategories).id
    : '000000000000000000000001'; // fallback ID

  const slug = randomSlug();

  const resp = await apiCall('product.create', 'POST', cookies, {
    name: randomProductName(),
    slug,
    description: `Load test product created at ${new Date().toISOString()}`,
    price: Number(randomBetween(5.99, 499.99).toFixed(2)),
    categoryId: catId,
    images: ['https://example.com/placeholder.jpg'],
    variants: [],
    inventory: randomInt(0, 500),
    tags: ['loadtest', 'automated'],
    isActive: true,
    isFeatured: Math.random() < 0.2,
    rating: 0,
    reviewCount: 0,
  });

  if (resp.ok) {
    const data = resp.data as { _id?: string; slug?: string };
    if (data?._id) {
      state.knownProducts.push({ id: data._id, slug: data.slug ?? slug });
    }
    logOperation('CREATE_PRODUCT', `${slug}`, 'OK');
    recordStat('CREATE_PRODUCT', true);
  } else if (resp.code === 'UNAUTHORIZED') {
    // Refresh admin auth and retry once
    const newCookies = await refreshAdminAuth();
    const retryResp = await apiCall('product.create', 'POST', newCookies, {
      name: randomProductName(),
      slug: randomSlug(),
      description: 'Load test product (retry)',
      price: Number(randomBetween(5.99, 499.99).toFixed(2)),
      categoryId: catId,
      images: ['https://example.com/placeholder.jpg'],
      variants: [],
      inventory: randomInt(0, 500),
      tags: ['loadtest'],
      isActive: true,
      isFeatured: false,
      rating: 0,
      reviewCount: 0,
    });
    if (retryResp.ok) {
      logOperation('CREATE_PRODUCT', `${slug} (retry ok)`, 'OK');
      recordStat('CREATE_PRODUCT', true);
    } else {
      logOperation('CREATE_PRODUCT', `${slug} → ${retryResp.error}`, 'ERROR');
      recordStat('CREATE_PRODUCT', false);
    }
  } else {
    logOperation('CREATE_PRODUCT', `${slug} → ${resp.error}`, 'ERROR');
    recordStat('CREATE_PRODUCT', false);
  }
}

async function opUpdateProduct(): Promise<void> {
  const cookies = await ensureAdminAuth();

  // Pick a known product; if none exist, create one first
  let product = state.knownProducts.length > 0
    ? pickRandom(state.knownProducts)
    : null;

  if (!product) {
    logOperation('UPDATE_PRODUCT', 'No known products, skipping', 'SKIP');
    recordStat('UPDATE_PRODUCT', true); // not a failure
    return;
  }

  const newPrice = Number(randomBetween(1.99, 999.99).toFixed(2));
  const resp = await apiCall('product.update', 'POST', cookies, {
    id: product.id,
    data: { price: newPrice },
  });

  if (resp.ok) {
    logOperation('UPDATE_PRODUCT', `${product.id} price→${newPrice}`, 'OK');
    recordStat('UPDATE_PRODUCT', true);
  } else if (resp.code === 'UNAUTHORIZED') {
    const newCookies = await refreshAdminAuth();
    const retryResp = await apiCall('product.update', 'POST', newCookies, {
      id: product.id,
      data: { price: newPrice },
    });
    if (retryResp.ok) {
      logOperation('UPDATE_PRODUCT', `${product.id} (retry ok)`, 'OK');
      recordStat('UPDATE_PRODUCT', true);
    } else {
      logOperation('UPDATE_PRODUCT', `${product.id} → ${retryResp.error}`, 'ERROR');
      recordStat('UPDATE_PRODUCT', false);
    }
  } else {
    logOperation('UPDATE_PRODUCT', `${product.id} → ${resp.error}`, 'ERROR');
    recordStat('UPDATE_PRODUCT', false);
  }
}

async function opDeleteProduct(): Promise<void> {
  const cookies = await ensureAdminAuth();

  // Pick a known product created by load test (prefer ones with "loadtest" slug)
  let idx = state.knownProducts.findIndex((p) => p.slug?.startsWith('loadtest-'));
  if (idx === -1 && state.knownProducts.length > 0) {
    idx = Math.floor(Math.random() * state.knownProducts.length);
  }

  if (idx === -1) {
    logOperation('DELETE_PRODUCT', 'No known products, skipping', 'SKIP');
    recordStat('DELETE_PRODUCT', true);
    return;
  }

  const product = state.knownProducts[idx];
  state.knownProducts.splice(idx, 1);

  const resp = await apiCall('product.delete', 'POST', cookies, { id: product.id });

  if (resp.ok) {
    logOperation('DELETE_PRODUCT', `${product.id}`, 'OK');
    recordStat('DELETE_PRODUCT', true);
  } else if (resp.code === 'UNAUTHORIZED') {
    const newCookies = await refreshAdminAuth();
    const retryResp = await apiCall('product.delete', 'POST', newCookies, { id: product.id });
    if (retryResp.ok) {
      logOperation('DELETE_PRODUCT', `${product.id} (retry ok)`, 'OK');
      recordStat('DELETE_PRODUCT', true);
    } else {
      logOperation('DELETE_PRODUCT', `${product.id} → ${retryResp.error}`, 'ERROR');
      recordStat('DELETE_PRODUCT', false);
    }
  } else if (resp.code === 'NOT_FOUND') {
    logOperation('DELETE_PRODUCT', `${product.id} → not found (already deleted)`, 'SKIP');
    recordStat('DELETE_PRODUCT', true);
  } else {
    logOperation('DELETE_PRODUCT', `${product.id} → ${resp.error}`, 'ERROR');
    recordStat('DELETE_PRODUCT', false);
  }
}

async function opAddToCart(): Promise<void> {
  const cookies = await ensureCustomerAuth();

  // Need a product
  let product = state.knownProducts.length > 0
    ? pickRandom(state.knownProducts)
    : null;

  if (!product) {
    logOperation('ADD_TO_CART', 'No known products, skipping', 'SKIP');
    recordStat('ADD_TO_CART', true);
    return;
  }

  const qty = randomInt(1, 3);
  const resp = await apiCall('cart.addItem', 'POST', cookies, {
    productId: product.id,
    quantity: qty,
  });

  if (resp.ok) {
    logOperation('ADD_TO_CART', `${product.id} x${qty}`, 'OK');
    recordStat('ADD_TO_CART', true);
  } else if (resp.code === 'UNAUTHORIZED') {
    const newCookies = await refreshCustomerAuth();
    const retryResp = await apiCall('cart.addItem', 'POST', newCookies, {
      productId: product.id,
      quantity: qty,
    });
    if (retryResp.ok) {
      logOperation('ADD_TO_CART', `${product.id} (retry ok)`, 'OK');
      recordStat('ADD_TO_CART', true);
    } else {
      logOperation('ADD_TO_CART', `${product.id} → ${retryResp.error}`, 'ERROR');
      recordStat('ADD_TO_CART', false);
    }
  } else {
    logOperation('ADD_TO_CART', `${product.id} → ${resp.error}`, 'ERROR');
    recordStat('ADD_TO_CART', false);
  }
}

async function opCreateOrder(): Promise<void> {
  const cookies = await ensureCustomerAuth();

  // Need at least one product
  if (state.knownProducts.length === 0) {
    logOperation('CREATE_ORDER', 'No known products, skipping', 'SKIP');
    recordStat('CREATE_ORDER', true);
    return;
  }

  // Pick 1-3 products for the order
  const itemCount = Math.min(randomInt(1, 3), state.knownProducts.length);
  const shuffled = [...state.knownProducts].sort(() => Math.random() - 0.5);
  const items = shuffled.slice(0, itemCount).map((p) => ({
    productId: p.id,
    quantity: randomInt(1, 2),
  }));

  const resp = await apiCall('order.create', 'POST', cookies, {
    items,
    shippingAddress: {
      firstName: 'Load',
      lastName: 'Tester',
      street: `${randomInt(1, 9999)} Test Street`,
      city: 'Testville',
      state: 'TX',
      zip: '75001',
      country: 'US',
      phone: '555-0100',
    },
    idempotencyKey: randomUUID(),
  });

  if (resp.ok) {
    logOperation('CREATE_ORDER', `${itemCount} item(s)`, 'OK');
    recordStat('CREATE_ORDER', true);
  } else if (resp.code === 'UNAUTHORIZED') {
    const newCookies = await refreshCustomerAuth();
    const retryResp = await apiCall('order.create', 'POST', newCookies, {
      items,
      shippingAddress: {
        firstName: 'Load',
        lastName: 'Tester',
        street: `${randomInt(1, 9999)} Test Street`,
        city: 'Testville',
        state: 'TX',
        zip: '75001',
        country: 'US',
        phone: '555-0100',
      },
      idempotencyKey: randomUUID(),
    });
    if (retryResp.ok) {
      logOperation('CREATE_ORDER', `${itemCount} item(s) (retry ok)`, 'OK');
      recordStat('CREATE_ORDER', true);
    } else {
      logOperation('CREATE_ORDER', `→ ${retryResp.error}`, 'ERROR');
      recordStat('CREATE_ORDER', false);
    }
  } else {
    logOperation('CREATE_ORDER', `→ ${resp.error}`, 'ERROR');
    recordStat('CREATE_ORDER', false);
  }
}

async function opAdminOverview(): Promise<void> {
  const cookies = await ensureAdminAuth();

  const resp = await apiQueryGET('analytics.overview', cookies);

  if (resp.ok) {
    const data = resp.data as { totalRevenue?: number; ordersTotal?: number; totalUsers?: number };
    logOperation(
      'ADMIN_OVERVIEW',
      `revenue=${data?.totalRevenue ?? '?'} orders=${data?.ordersTotal ?? '?'} users=${data?.totalUsers ?? '?'}`,
      'OK',
    );
    recordStat('ADMIN_OVERVIEW', true);
  } else if (resp.code === 'UNAUTHORIZED') {
    const newCookies = await refreshAdminAuth();
    const retryResp = await apiQueryGET('analytics.overview', newCookies);
    if (retryResp.ok) {
      logOperation('ADMIN_OVERVIEW', '(retry ok)', 'OK');
      recordStat('ADMIN_OVERVIEW', true);
    } else {
      logOperation('ADMIN_OVERVIEW', `→ ${retryResp.error}`, 'ERROR');
      recordStat('ADMIN_OVERVIEW', false);
    }
  } else {
    logOperation('ADMIN_OVERVIEW', `→ ${resp.error}`, 'ERROR');
    recordStat('ADMIN_OVERVIEW', false);
  }
}

// ─────────────────────────────────────────────────────────────
// Operation Registry (weighted random selection)
// ─────────────────────────────────────────────────────────────

const OPERATIONS: (OperationConfig & { fn: () => Promise<void> })[] = [
  { type: 'LIST_PRODUCTS', weight: 20, auth: 'none', fn: opListProducts },
  { type: 'LOGIN', weight: 10, auth: 'none', fn: opLogin },
  { type: 'CREATE_USER', weight: 10, auth: 'none', fn: opCreateUser },
  { type: 'CREATE_PRODUCT', weight: 12, auth: 'admin', fn: opCreateProduct },
  { type: 'UPDATE_PRODUCT', weight: 10, auth: 'admin', fn: opUpdateProduct },
  { type: 'DELETE_PRODUCT', weight: 5, auth: 'admin', fn: opDeleteProduct },
  { type: 'ADD_TO_CART', weight: 15, auth: 'customer', fn: opAddToCart },
  { type: 'CREATE_ORDER', weight: 10, auth: 'customer', fn: opCreateOrder },
  { type: 'ADMIN_OVERVIEW', weight: 8, auth: 'admin', fn: opAdminOverview },
];

const TOTAL_WEIGHT = OPERATIONS.reduce((s, o) => s + o.weight, 0);

function pickOperation(): (OperationConfig & { fn: () => Promise<void> }) {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const op of OPERATIONS) {
    r -= op.weight;
    if (r <= 0) return op;
  }
  return OPERATIONS[OPERATIONS.length - 1];
}

// ─────────────────────────────────────────────────────────────
// Stats & Summary
// ─────────────────────────────────────────────────────────────

interface Summary {
  total: number;
  ok: number;
  fail: number;
  byType: Map<string, { total: number; ok: number; fail: number }>;
  startTime: number;
  endTime?: number;
}

const summary: Summary = {
  total: 0,
  ok: 0,
  fail: 0,
  byType: new Map(),
  startTime: Date.now(),
};

function printSummary(): void {
  const end = Date.now();
  const durationMs = end - summary.startTime;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const runtime = `${minutes}m ${seconds}s`;

  console.log('\n' + '═'.repeat(60));
  console.log('  Load Test Summary');
  console.log('═'.repeat(60));
  console.log(`  Total operations: ${summary.total}`);
  console.log(`  Successful:       ${Colors.green}${summary.ok}${Colors.reset}`);
  console.log(`  Failed:           ${summary.fail > 0 ? Colors.red : ''}${summary.fail}${Colors.reset}`);
  console.log(`  Runtime:          ${runtime}\n`);

  console.log('  By type:');
  for (const [, s] of stats) {
    const okStr = s.fail === 0
      ? `${Colors.green}${s.ok} ok${Colors.reset}`
      : `${s.ok} ok, ${Colors.red}${s.fail} fail${Colors.reset}`;
    console.log(`    ${s.type.padEnd(20)} ${s.total} (${okStr})`);
  }

  if (summary.fail > 0) {
    console.log(`\n  ${Colors.yellow}⚠ Some operations failed — review logs above.${Colors.reset}`);
  }
  console.log('═'.repeat(60));
  console.log('');
}

// ─────────────────────────────────────────────────────────────
// Main Runner
// ─────────────────────────────────────────────────────────────

let running = true;
let opsCompleted = 0;
const opsLimit = parseArgs().count;
const delayMs = parseArgs().delay;
const concurrency = parseArgs().concurrency;

async function workerLoop(workerId: number): Promise<void> {
  while (running) {
    // Check operation limit
    if (opsCompleted >= opsLimit) {
      running = false;
      break;
    }

    // Pick and run an operation
    const op = pickOperation();
    try {
      await op.fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logOperation(op.type, `Unhandled error: ${msg}`, 'ERROR');
      recordStat(op.type, false);
    }

    opsCompleted++;
    summary.total++;
    // Update summary from stats
    summary.ok = 0;
    summary.fail = 0;
    for (const [, s] of stats) {
      summary.ok += s.ok;
      summary.fail += s.fail;
    }

    // Delay between operations
    if (running) {
      const delay = delayMs > 0 ? delayMs : randomBetween(500, 3000);
      await sleep(delay);
    }
  }
}

async function main(): Promise<void> {
  // Parse args
  const opts = parseArgs();
  const countDesc = opts.count === Infinity ? 'unlimited' : String(opts.count);
  console.log(`${Colors.cyan}╔${'═'.repeat(58)}╗${Colors.reset}`);
  console.log(`${Colors.cyan}║${Colors.reset}  E-Commerce API — Random Load Test`);
  console.log(`${Colors.cyan}║${Colors.reset}  Target: ${API_BASE}`);
  console.log(`${Colors.cyan}║${Colors.reset}  Count:  ${countDesc}  |  Delay: ${opts.delay > 0 ? opts.delay + 'ms' : 'random 500-3000ms'}  |  Concurrency: ${opts.concurrency}`);
  console.log(`${Colors.cyan}╚${'═'.repeat(58)}╝${Colors.reset}`);
  console.log('');

  // Initialize
  await initialize();

  // Start workers
  const workers: Promise<void>[] = [];
  for (let i = 0; i < opts.concurrency; i++) {
    workers.push(workerLoop(i + 1));
  }

  // Wait for all workers to finish
  await Promise.all(workers);

  // Print final summary
  printSummary();
}

// ─────────────────────────────────────────────────────────────
// Signal Handling
// ─────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  if (!running) return;
  running = false;
  console.log(`\n${Colors.yellow}⏹  Received SIGINT — stopping...${Colors.reset}\n`);
  // Print summary immediately
  printSummary();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (!running) return;
  running = false;
  console.log(`\n${Colors.yellow}⏹  Received SIGTERM — stopping...${Colors.reset}\n`);
  printSummary();
  process.exit(0);
});

// ─────────────────────────────────────────────────────────────
// Unhandled rejection guard
// ─────────────────────────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  console.error(`${Colors.red}[FATAL] Unhandled rejection:${Colors.reset}`, err);
});

// ─────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(`${Colors.red}[FATAL] Load test crashed:${Colors.reset}`, err);
  printSummary();
  process.exit(1);
});
