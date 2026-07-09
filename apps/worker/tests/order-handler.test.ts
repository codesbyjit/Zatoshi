import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestMongoClient, getTestRedis } from './setup';

// ──────────────────────────────────────────
// Mock the services at module level
// Use vi.hoisted so variables exist before vi.mock factories run
// ──────────────────────────────────────────

const { mockSendEmail, mockDecrementInventory, mockUpdatePaymentStatus, mockUpdateOrderStatus } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockDecrementInventory: vi.fn(),
  mockUpdatePaymentStatus: vi.fn(),
  mockUpdateOrderStatus: vi.fn(),
}));

vi.mock('../src/services/email.service', () => ({
  sendEmail: mockSendEmail,
  orderConfirmationEmail: vi.fn((userName: string, orderNumber: string) => ({
    subject: `Order Confirmed — ${orderNumber}`,
    body: `Your order ${orderNumber} has been confirmed!`,
  })),
  welcomeEmail: vi.fn((userName: string) => ({
    subject: 'Welcome to Our Store!',
    body: `Hi ${userName}, welcome!`,
  })),
  shippingUpdateEmail: vi.fn(() => ({
    subject: 'Shipping Update',
    body: 'Your order has shipped!',
  })),
}));

vi.mock('../src/services/inventory.service', () => ({
  decrementInventory: mockDecrementInventory,
  incrementInventory: vi.fn(),
}));

vi.mock('../src/services/order.service', () => ({
  updatePaymentStatus: mockUpdatePaymentStatus,
  updateOrderStatus: mockUpdateOrderStatus,
}));

// ──────────────────────────────────────────
// Import after mocks are set up
// ──────────────────────────────────────────

import { handleOrderPlaced } from '../src/handlers/order-placed';
import { handlePaymentProcessed } from '../src/handlers/payment-processed';
import { handleUserCreated } from '../src/handlers/user-created';

describe('handleOrderPlaced', () => {
  beforeEach(async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    vi.clearAllMocks();
  });

  it('should send a confirmation email and decrement inventory on order placed', async () => {
    const payload = {
      orderId: 'ord-123',
      userId: 'usr-456',
      userEmail: 'test@example.com',
      userName: 'Test User',
      orderNumber: 'ORD-000001',
      items: [
        {
          productId: 'prod-1',
          variantInfo: undefined,
          name: 'Test Product',
          price: 29.99,
          quantity: 2,
          image: 'https://example.com/img.jpg',
        } as any,
        {
          productId: 'prod-2',
          variantInfo: 'Large',
          name: 'Test Variant Product',
          price: 39.99,
          quantity: 1,
          image: 'https://example.com/img2.jpg',
        } as any,
      ],
      total: 99.97,
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
        phone: '+1-555-0100',
      },
    };

    await handleOrderPlaced(payload);

    // Verify email was called
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(String),
      expect.any(String),
    );

    // Verify inventory was decremented for both items
    expect(mockDecrementInventory).toHaveBeenCalledTimes(2);
    expect(mockDecrementInventory).toHaveBeenCalledWith('prod-1', null, 2);
    expect(mockDecrementInventory).toHaveBeenCalledWith('prod-2', 'Large', 1);
  });

  it('should handle gracefully when no user email is provided', async () => {
    const payload = {
      orderId: 'ord-789',
      userId: 'usr-012',
      userEmail: undefined,
      userName: undefined,
      items: [
        {
          productId: 'prod-3',
          variantInfo: undefined,
          name: 'Another Product',
          price: 19.99,
          quantity: 1,
          image: 'https://example.com/img3.jpg',
        } as any,
      ],
      total: 19.99,
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Doe',
        street: '456 Oak Ave',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
        country: 'US',
        phone: '+1-555-0200',
      },
    };

    await expect(handleOrderPlaced(payload)).resolves.not.toThrow();

    // Email should not be sent since no userEmail provided
    expect(mockSendEmail).not.toHaveBeenCalled();

    // Inventory should still be decremented
    expect(mockDecrementInventory).toHaveBeenCalledTimes(1);
  });
});

describe('handlePaymentProcessed', () => {
  beforeEach(async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    vi.clearAllMocks();
  });

  it('should update order payment status and order status to confirmed on paid', async () => {
    const payload = {
      orderId: 'ord-123',
      status: 'paid' as const,
      transactionId: 'txn-abc-123',
      amount: 99.97,
      currency: 'USD',
    };

    await handlePaymentProcessed(payload);

    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith('ord-123', 'paid');
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('ord-123', 'confirmed');
  });

  it('should cancel order on payment failure', async () => {
    const payload = {
      orderId: 'ord-456',
      status: 'failed' as const,
    };

    await handlePaymentProcessed(payload);

    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith('ord-456', 'failed');
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith('ord-456', 'cancelled');
  });
});

describe('handleUserCreated', () => {
  beforeEach(async () => {
    const client = getTestMongoClient();
    const db = client.db('ecommerce_test');
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    vi.clearAllMocks();
  });

  it('should send a welcome email on user creation', async () => {
    const payload = {
      userId: 'usr-789',
      email: 'newuser@example.com',
      name: 'Test User',
    };

    await handleUserCreated(payload);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      'newuser@example.com',
      expect.any(String),
      expect.any(String),
    );
  });
});
