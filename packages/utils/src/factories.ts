import type {
  User,
  CreateUserInput,
  Category,
  CreateCategoryInput,
  Product,
  CreateProductInput,
  Order,
  CreateOrderInput,
  Cart,
  CartItem,
  ShippingAddress,
  OrderItem,
  ProductVariant,
} from '@repo/types';

// ──────────────────────────────────────────
// Factory helpers: build partial documents for tests & seed data
// Each function returns safe defaults that can be overridden.
// ──────────────────────────────────────────

let _objectIdCounter = 0;

/** Generate a unique, deterministic ObjectId-like string */
export function mockObjectId(): string {
  _objectIdCounter++;
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const counter = _objectIdCounter.toString(16).padStart(16, '0');
  return timestamp + counter.slice(0, 16);
}

/** Generate a unique order number */
export function mockOrderNumber(seq: number): string {
  return `ORD-${String(seq).padStart(6, '0')}`;
}

// ──────────────────────────────────────────
// User Factory
// ──────────────────────────────────────────

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    _id: mockObjectId(),
    email: 'test@example.com',
    passwordHash: '$2b$10$placeholder',
    name: 'Test User',
    role: 'customer',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function buildCreateUserInput(
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput {
  return {
    email: 'newuser@example.com',
    passwordHash: '$2b$10$placeholder',
    name: 'New User',
    role: 'customer',
    ...overrides,
  };
}

// ──────────────────────────────────────────
// Category Factory
// ──────────────────────────────────────────

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    _id: mockObjectId(),
    name: 'Uncategorized',
    slug: 'uncategorized',
    description: 'Default category.',
    sortOrder: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function buildCreateCategoryInput(
  overrides: Partial<CreateCategoryInput> = {},
): CreateCategoryInput {
  return {
    name: 'New Category',
    slug: 'new-category',
    description: 'A brand new category.',
    sortOrder: 0,
    ...overrides,
  };
}

// ──────────────────────────────────────────
// Product Factory
// ──────────────────────────────────────────

export function buildProductVariant(
  overrides: Partial<ProductVariant> = {},
): ProductVariant {
  return {
    name: 'Default',
    sku: 'SKU-001',
    price: 29.99,
    inventory: 100,
    ...overrides,
  };
}

export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    _id: mockObjectId(),
    name: 'Sample Product',
    slug: 'sample-product',
    description: 'A sample product for testing.',
    price: 29.99,
    categoryId: mockObjectId(),
    images: ['https://via.placeholder.com/600'],
    variants: [buildProductVariant()],
    inventory: 100,
    tags: ['sample'],
    isActive: true,
    isFeatured: false,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function buildCreateProductInput(
  overrides: Partial<CreateProductInput> = {},
): CreateProductInput {
  return {
    name: 'New Product',
    slug: 'new-product',
    description: 'A brand new product.',
    price: 19.99,
    categoryId: mockObjectId(),
    images: ['https://via.placeholder.com/600'],
    variants: [buildProductVariant()],
    inventory: 50,
    tags: ['new'],
    isActive: true,
    isFeatured: false,
    rating: 0,
    reviewCount: 0,
    ...overrides,
  };
}

// ──────────────────────────────────────────
// Order Factory
// ──────────────────────────────────────────

export function buildShippingAddress(
  overrides: Partial<ShippingAddress> = {},
): ShippingAddress {
  return {
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    country: 'US',
    phone: '+1-555-0100',
    ...overrides,
  };
}

export function buildOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    productId: mockObjectId(),
    name: 'Sample Item',
    price: 29.99,
    quantity: 1,
    image: 'https://via.placeholder.com/150',
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  const subtotal = 29.99;
  const shippingCost = 5.99;
  const tax = 2.40;
  return {
    _id: mockObjectId(),
    orderNumber: mockOrderNumber(1),
    userId: mockObjectId(),
    status: 'pending',
    items: [buildOrderItem()],
    shippingAddress: buildShippingAddress(),
    subtotal,
    shippingCost,
    tax,
    total: subtotal + shippingCost + tax,
    paymentStatus: 'pending',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function buildCreateOrderInput(
  overrides: Partial<CreateOrderInput> = {},
): CreateOrderInput {
  const subtotal = 29.99;
  const shippingCost = 5.99;
  const tax = 2.40;
  return {
    userId: mockObjectId(),
    status: 'pending',
    items: [buildOrderItem()],
    shippingAddress: buildShippingAddress(),
    subtotal,
    shippingCost,
    tax,
    total: subtotal + shippingCost + tax,
    paymentStatus: 'pending',
    ...overrides,
  };
}

// ──────────────────────────────────────────
// Cart Factory
// ──────────────────────────────────────────

export function buildCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: mockObjectId(),
    name: 'Sample Item',
    price: 29.99,
    image: 'https://via.placeholder.com/150',
    quantity: 1,
    ...overrides,
  };
}

export function buildCart(overrides: Partial<Cart> = {}): Cart {
  return {
    _id: mockObjectId(),
    items: [buildCartItem()],
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}
