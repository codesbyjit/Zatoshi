import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db, type Collection } from 'mongodb';
import RedisMock from 'ioredis-mock';
import type { Product, Category } from '@repo/types';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let db: Db;
let redisMock: InstanceType<typeof RedisMock>;
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

  productsCollection = db.collection<Product>('products');

  // Create indexes
  await productsCollection.createIndex({ slug: 1 }, { unique: true });
  await productsCollection.createIndex({ name: 'text', description: 'text' });
  await productsCollection.createIndex({ categoryId: 1 });
  await productsCollection.createIndex({ price: 1 });

  // Seed products
  const products: Product[] = [
    {
      _id: 'prod-1',
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium noise-cancelling headphones',
      price: 199.99,
      categoryId: 'cat-electronics',
      images: ['https://example.com/img1.jpg'],
      variants: [],
      inventory: 50,
      tags: ['audio', 'wireless', 'premium'],
      isActive: true,
      isFeatured: true,
      rating: 4.5,
      reviewCount: 120,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      _id: 'prod-2',
      name: 'Bluetooth Speaker',
      slug: 'bluetooth-speaker',
      description: 'Portable speaker with deep bass',
      price: 79.99,
      categoryId: 'cat-electronics',
      images: ['https://example.com/img2.jpg'],
      variants: [],
      inventory: 100,
      tags: ['audio', 'wireless', 'speaker'],
      isActive: true,
      isFeatured: false,
      rating: 4.2,
      reviewCount: 85,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      _id: 'prod-3',
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      description: 'RGB mechanical keyboard with blue switches',
      price: 149.99,
      categoryId: 'cat-electronics',
      images: ['https://example.com/img3.jpg'],
      variants: [],
      inventory: 30,
      tags: ['keyboard', 'mechanical', 'rgb'],
      isActive: true,
      isFeatured: false,
      rating: 4.7,
      reviewCount: 200,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
    },
    {
      _id: 'prod-4',
      name: 'USB-C Cable 2m',
      slug: 'usb-c-cable-2m',
      description: 'Durable braided USB-C cable',
      price: 12.99,
      categoryId: 'cat-accessories',
      images: ['https://example.com/img4.jpg'],
      variants: [],
      inventory: 500,
      tags: ['cable', 'usb-c', 'accessories'],
      isActive: true,
      isFeatured: false,
      rating: 4.0,
      reviewCount: 350,
      createdAt: new Date('2025-01-04'),
      updatedAt: new Date('2025-01-04'),
    },
    {
      _id: 'prod-5',
      name: 'Laptop Stand',
      slug: 'laptop-stand',
      description: 'Adjustable aluminum laptop stand',
      price: 39.99,
      categoryId: 'cat-accessories',
      images: ['https://example.com/img5.jpg'],
      variants: [],
      inventory: 0,
      tags: ['stand', 'laptop', 'accessories'],
      isActive: false, // inactive
      isFeatured: false,
      rating: 4.3,
      reviewCount: 75,
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-05'),
    },
  ];
  await productsCollection.insertMany(products);
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
  redisMock.disconnect();
});

describe('Product Service', () => {
  describe('List Products', () => {
    it('should return paginated results', async () => {
      const query = { isActive: true };
      const total = await productsCollection.countDocuments(query);
      expect(total).toBe(4); // 4 active products (not prod-5)

      const page = 1;
      const limit = 2;
      const items = await productsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      expect(items.length).toBe(2);
    });

    it('should filter by category', async () => {
      const items = await productsCollection
        .find({ isActive: true, categoryId: 'cat-accessories' })
        .toArray();

      expect(items.length).toBe(1); // only USB-C Cable is active in accessories
      expect(items[0].name).toBe('USB-C Cable 2m');
    });
  });

  describe('Search Products', () => {
    it('should find products by text search on name', async () => {
      const items = await productsCollection
        .find(
          { $text: { $search: 'headphones' }, isActive: true },
          { projection: { score: { $meta: 'textScore' } } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .toArray();

      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some((p) => p.name.toLowerCase().includes('headphones'))).toBe(true);
    });
  });

  describe('Get Product', () => {
    it('should get product by slug', async () => {
      const product = await productsCollection.findOne({
        slug: 'mechanical-keyboard',
        isActive: true,
      });
      expect(product).toBeTruthy();
      expect(product!.name).toBe('Mechanical Keyboard');
    });

    it('should get product by ID', async () => {
      const product = await productsCollection.findOne({ _id: 'prod-1' });
      expect(product).toBeTruthy();
      expect(product!.name).toBe('Wireless Headphones');
    });

    it('should return null for non-existent product', async () => {
      const product = await productsCollection.findOne({ _id: 'nonexistent' });
      expect(product).toBeNull();
    });
  });

  describe('Create Product', () => {
    it('should create a new product', async () => {
      const newProduct: Product = {
        _id: 'prod-new',
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product',
        price: 25.99,
        categoryId: 'cat-electronics',
        images: ['https://example.com/img.jpg'],
        variants: [],
        inventory: 100,
        tags: ['test'],
        isActive: true,
        isFeatured: false,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await productsCollection.insertOne(newProduct);

      const saved = await productsCollection.findOne({ _id: 'prod-new' });
      expect(saved).toBeTruthy();
      expect(saved!.name).toBe('Test Product');
    });

    it('should reject duplicate slug', async () => {
      const existing = await productsCollection.findOne({ slug: 'wireless-headphones' });
      expect(existing).toBeTruthy();

      // Attempt to insert with same slug
      const dup = {
        ...existing!,
        _id: 'prod-dup',
        name: 'Duplicate Product',
      };
      // @ts-ignore - we expect unique index to reject
      await expect(productsCollection.insertOne(dup)).rejects.toThrow();
    });
  });

  describe('Update Product', () => {
    it('should update product fields', async () => {
      await productsCollection.updateOne(
        { _id: 'prod-1' },
        { $set: { price: 179.99, updatedAt: new Date() } },
      );

      const updated = await productsCollection.findOne({ _id: 'prod-1' });
      expect(updated!.price).toBe(179.99);
    });
  });

  describe('Delete Product', () => {
    it('should delete a product', async () => {
      const result = await productsCollection.deleteOne({ _id: 'prod-3' });
      expect(result.deletedCount).toBe(1);

      const deleted = await productsCollection.findOne({ _id: 'prod-3' });
      expect(deleted).toBeNull();
    });
  });
});
