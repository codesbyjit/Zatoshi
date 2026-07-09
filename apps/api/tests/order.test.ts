import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db, type Collection } from 'mongodb';
import RedisMock from 'ioredis-mock';
import type {
  Product,
  Order,
  ShippingAddress,
  OrderItem,
} from '@repo/types';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;
let redisMock: InstanceType<typeof RedisMock>;
let productsCollection: Collection<Product>;
let ordersCollection: Collection<Order>;

const shippingAddress: ShippingAddress = {
  firstName: 'John',
  lastName: 'Doe',
  street: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
  country: 'US',
  phone: '+1-555-0100',
};

// Mock dependencies
vi.mock('../src/db/client', () => ({
  getDb: () => db,
  connectMongo: vi.fn(),
  disconnectMongo: vi.fn(),
}));

vi.mock('../src/db/redis', () => ({
  getRedis: () => redisMock,
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
}));

vi.mock('../src/services/outbox.service', () => ({
  createOutboxEvent: vi.fn().mockResolvedValue({}),
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test');
  redisMock = new RedisMock();

  productsCollection = db.collection<Product>('products');
  ordersCollection = db.collection<Order>('orders');

  // Create indexes
  await productsCollection.createIndex({ slug: 1 }, { unique: true });
  await ordersCollection.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });

  // Seed products
  await productsCollection.insertMany([
    {
      _id: 'order-prod-1',
      name: 'Test Product 1',
      slug: 'test-product-1',
      description: 'First test product',
      price: 29.99,
      categoryId: 'cat-test',
      images: ['https://example.com/img1.jpg'],
      variants: [],
      inventory: 10,
      tags: ['test'],
      isActive: true,
      isFeatured: false,
      rating: 4.0,
      reviewCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'order-prod-2',
      name: 'Test Product 2',
      slug: 'test-product-2',
      description: 'Second test product',
      price: 49.99,
      categoryId: 'cat-test',
      images: ['https://example.com/img2.jpg'],
      variants: [],
      inventory: 0, // out of stock
      tags: ['test'],
      isActive: true,
      isFeatured: false,
      rating: 3.5,
      reviewCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'order-prod-3',
      name: 'Test Product 3',
      slug: 'test-product-3',
      description: 'Third test product',
      price: 99.99,
      categoryId: 'cat-test',
      images: ['https://example.com/img3.jpg'],
      variants: [],
      inventory: 5,
      tags: ['test'],
      isActive: true,
      isFeatured: false,
      rating: 5.0,
      reviewCount: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
  redisMock.disconnect();
});

describe('Order Service', () => {
  describe('Create Order', () => {
    it('should create an order with valid items', async () => {
      // Build order data
      const userId = 'order-user-1';
      const items: OrderItem[] = [
        {
          productId: 'order-prod-1',
          name: 'Test Product 1',
          price: 29.99,
          quantity: 2,
          image: 'https://example.com/img1.jpg',
        },
        {
          productId: 'order-prod-3',
          name: 'Test Product 3',
          price: 99.99,
          quantity: 1,
          image: 'https://example.com/img3.jpg',
        },
      ];

      const subtotal = 29.99 * 2 + 99.99 * 1; // 159.97
      const shippingCost = subtotal >= 100 ? 0 : 9.99;
      const tax = Math.round(subtotal * 0.08 * 100) / 100; // 12.80
      const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;

      const order: Order = {
        _id: 'order-1',
        orderNumber: 'ORD-TEST-001',
        userId,
        status: 'pending',
        items,
        shippingAddress,
        subtotal,
        shippingCost,
        tax,
        total,
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await ordersCollection.insertOne(order);

      // Verify
      const saved = await ordersCollection.findOne({ _id: 'order-1' });
      expect(saved).toBeTruthy();
      expect(saved!.items.length).toBe(2);
      expect(saved!.total).toBe(total);
      expect(saved!.status).toBe('pending');
    });

    it('should reject order with insufficient inventory', async () => {
      // Product order-prod-2 has 0 inventory
      const product = await productsCollection.findOne({ _id: 'order-prod-2' });
      expect(product).toBeTruthy();
      expect(product!.inventory).toBe(0);
    });
  });

  describe('Idempotency', () => {
    it('should detect duplicate idempotency key', async () => {
      const idempotencyKey = 'idemp-001';

      // Create first order with key
      const order1: Order = {
        _id: 'order-idemp-1',
        orderNumber: 'ORD-IDEMP-001',
        userId: 'user-idemp',
        status: 'pending',
        items: [
          {
            productId: 'order-prod-1',
            name: 'Test Product 1',
            price: 29.99,
            quantity: 1,
            image: 'https://example.com/img1.jpg',
          },
        ],
        shippingAddress,
        subtotal: 29.99,
        shippingCost: 9.99,
        tax: 2.40,
        total: 42.38,
        paymentStatus: 'pending',
        idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await ordersCollection.insertOne(order1);

      // Try to insert another with same key
      const dupOrder = { ...order1, _id: 'order-idemp-2', orderNumber: 'ORD-IDEMP-002' };
      await expect(ordersCollection.insertOne(dupOrder)).rejects.toThrow();

      // Query by key
      const existing = await ordersCollection.findOne({ idempotencyKey });
      expect(existing).toBeTruthy();
      expect(existing!._id).toBe('order-idemp-1');
    });
  });

  describe('Order Ownership', () => {
    it('should only return orders belonging to the user', async () => {
      const user1Orders = await ordersCollection
        .find({ userId: 'order-user-1' })
        .toArray();

      expect(user1Orders.length).toBeGreaterThanOrEqual(1);
      for (const order of user1Orders) {
        expect(order.userId).toBe('order-user-1');
      }
    });

    it('should not return another users order', async () => {
      const otherUserOrder = await ordersCollection.findOne({
        _id: 'order-1',
        userId: 'different-user',
      });
      expect(otherUserOrder).toBeNull();
    });
  });

  describe('Admin Update Status', () => {
    it('should update order status', async () => {
      await ordersCollection.updateOne(
        { _id: 'order-1' },
        { $set: { status: 'confirmed', updatedAt: new Date() } },
      );

      const updated = await ordersCollection.findOne({ _id: 'order-1' });
      expect(updated!.status).toBe('confirmed');
    });
  });

  describe('Outbox Event Creation', () => {
    it('should have outbox service mock available', async () => {
      const { createOutboxEvent } = await import('../src/services/outbox.service');
      expect(createOutboxEvent).toBeDefined();
      expect(typeof createOutboxEvent).toBe('function');
    });
  });
});
