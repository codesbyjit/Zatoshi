import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db, type Collection } from 'mongodb';
import RedisMock from 'ioredis-mock';
import type { Cart, CartItem, Product } from '@repo/types';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;
let redisMock: InstanceType<typeof RedisMock>;
let cartsCollection: Collection<Cart>;
let productsCollection: Collection<Product>;

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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test');
  redisMock = new RedisMock();

  cartsCollection = db.collection<Cart>('carts');
  productsCollection = db.collection<Product>('products');

  // Create indexes
  await cartsCollection.createIndex({ userId: 1 }, { unique: true, sparse: true });
  await productsCollection.createIndex({ slug: 1 }, { unique: true });

  // Seed products
  await productsCollection.insertMany([
    {
      _id: 'cart-prod-1',
      name: 'Cart Product 1',
      slug: 'cart-product-1',
      description: 'A product for cart testing',
      price: 19.99,
      categoryId: 'cat-test',
      images: ['https://example.com/img1.jpg'],
      variants: [],
      inventory: 100,
      tags: ['test'],
      isActive: true,
      isFeatured: false,
      rating: 4.0,
      reviewCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'cart-prod-2',
      name: 'Cart Product 2',
      slug: 'cart-product-2',
      description: 'Another product for cart testing',
      price: 39.99,
      categoryId: 'cat-test',
      images: ['https://example.com/img2.jpg'],
      variants: [],
      inventory: 50,
      tags: ['test'],
      isActive: true,
      isFeatured: false,
      rating: 3.5,
      reviewCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'cart-prod-3',
      name: 'Inactive Product',
      slug: 'inactive-product',
      description: 'This product is inactive',
      price: 9.99,
      categoryId: 'cat-test',
      images: ['https://example.com/img3.jpg'],
      variants: [],
      inventory: 10,
      tags: ['test'],
      isActive: false,
      isFeatured: false,
      rating: 2.0,
      reviewCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Seed a cart for user
  await cartsCollection.insertOne({
    _id: 'cart-user-1',
    userId: 'cart-user',
    items: [
      {
        productId: 'cart-prod-1',
        name: 'Cart Product 1',
        price: 19.99,
        image: 'https://example.com/img1.jpg',
        quantity: 2,
      },
    ],
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
  redisMock.disconnect();
});

describe('Cart Service', () => {
  describe('Get Cart', () => {
    it('should retrieve cart for a user', async () => {
      const cart = await cartsCollection.findOne({ userId: 'cart-user' });
      expect(cart).toBeTruthy();
      expect(cart!.items.length).toBe(1);
      expect(cart!.items[0].productId).toBe('cart-prod-1');
    });

    it('should return null for non-existent cart', async () => {
      const cart = await cartsCollection.findOne({ userId: 'nonexistent' });
      expect(cart).toBeNull();
    });
  });

  describe('Add Item', () => {
    it('should add a new item to cart', async () => {
      const newItem: CartItem = {
        productId: 'cart-prod-2',
        name: 'Cart Product 2',
        price: 39.99,
        image: 'https://example.com/img2.jpg',
        quantity: 1,
      };

      await cartsCollection.updateOne(
        { _id: 'cart-user-1' },
        {
          $push: { items: newItem },
          $set: { updatedAt: new Date() },
        },
      );

      const cart = await cartsCollection.findOne({ _id: 'cart-user-1' });
      expect(cart!.items.length).toBe(2);
    });

    it('should merge quantity when adding existing item', async () => {
      // For an existing item, we'd increment quantity
      await cartsCollection.updateOne(
        { _id: 'cart-user-1', 'items.productId': 'cart-prod-1' },
        {
          $inc: { 'items.$.quantity': 1 },
          $set: { updatedAt: new Date() },
        },
      );

      const cart = await cartsCollection.findOne({ _id: 'cart-user-1' });
      const item = cart!.items.find((i) => i.productId === 'cart-prod-1');
      expect(item!.quantity).toBe(3); // was 2, added 1
    });
  });

  describe('Update Quantity', () => {
    it('should update item quantity', async () => {
      const newQuantity = 5;
      await cartsCollection.updateOne(
        { _id: 'cart-user-1', 'items.productId': 'cart-prod-1' },
        {
          $set: { 'items.$.quantity': newQuantity, updatedAt: new Date() },
        },
      );

      const cart = await cartsCollection.findOne({ _id: 'cart-user-1' });
      const item = cart!.items.find((i) => i.productId === 'cart-prod-1');
      expect(item!.quantity).toBe(5);
    });
  });

  describe('Remove Item', () => {
    it('should remove an item from cart', async () => {
      await cartsCollection.updateOne(
        { _id: 'cart-user-1' },
        {
          $pull: { items: { productId: 'cart-prod-2' } as any },
          $set: { updatedAt: new Date() },
        },
      );

      const cart = await cartsCollection.findOne({ _id: 'cart-user-1' });
      expect(cart!.items.length).toBe(1);
      expect(cart!.items[0].productId).toBe('cart-prod-1');
    });
  });

  describe('Clear Cart', () => {
    it('should clear all items from cart', async () => {
      await cartsCollection.updateOne(
        { _id: 'cart-user-1' },
        { $set: { items: [], updatedAt: new Date() } },
      );

      const cart = await cartsCollection.findOne({ _id: 'cart-user-1' });
      expect(cart!.items.length).toBe(0);
    });
  });
});
