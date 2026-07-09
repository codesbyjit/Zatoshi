import { beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, type Db } from 'mongodb';
import RedisMock from 'ioredis-mock';
import {
  USER_COLLECTION,
  PRODUCT_COLLECTION,
  CATEGORY_COLLECTION,
  ORDER_COLLECTION,
  CART_COLLECTION,
  OUTBOX_COLLECTION,
  type User,
  type Product,
  type Category,
} from '@repo/types';

// Override config for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let testDb: Db;

// Redis mock singleton
export let redisMock: InstanceType<typeof RedisMock>;

// Re-export for test use
export { testDb };

/**
 * Initialize the in-memory MongoDB and Redis mock for tests.
 * Call this in setup files or beforeAll hooks.
 */
async function setupTestInfra(): Promise<{
  db: Db;
  redis: InstanceType<typeof RedisMock>;
}> {
  // MongoDB — use cached binary with longer download timeout
  mongoServer = await MongoMemoryServer.create({
    binary: {
      downloadTimeout: 120,
    },
  });
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  testDb = mongoClient.db('test');

  // Redis mock
  redisMock = new RedisMock();

  return { db: testDb, redis: redisMock };
}

/**
 * Seed the test database with initial data.
 */
async function seedTestData(db: Db): Promise<{
  users: User[];
  products: Product[];
  category: Category;
}> {
  const users = db.collection<User>(USER_COLLECTION);
  const products = db.collection<Product>(PRODUCT_COLLECTION);
  const categories = db.collection<Category>(CATEGORY_COLLECTION);
  const orders = db.collection(ORDER_COLLECTION);
  const carts = db.collection(CART_COLLECTION);
  const outbox = db.collection(OUTBOX_COLLECTION);

  // Create indexes
  await users.createIndex({ email: 1 }, { unique: true });
  await products.createIndex({ slug: 1 }, { unique: true });
  await products.createIndex({ name: 'text', description: 'text' });
  await categories.createIndex({ slug: 1 }, { unique: true });

  // Seed category
  const category: Category = {
    _id: 'cat-001',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    sortOrder: 0,
    createdAt: new Date('2025-01-01'),
  };
  await categories.insertOne(category);

  // Seed products
  const productData: Product[] = [
    {
      _id: 'prod-001',
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium wireless headphones with noise cancellation',
      price: 199.99,
      categoryId: 'cat-001',
      images: ['https://via.placeholder.com/600'],
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
      _id: 'prod-002',
      name: 'Bluetooth Speaker',
      slug: 'bluetooth-speaker',
      description: 'Portable bluetooth speaker with deep bass',
      price: 79.99,
      categoryId: 'cat-001',
      images: ['https://via.placeholder.com/600'],
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
      _id: 'prod-003',
      name: 'USB-C Hub',
      slug: 'usb-c-hub',
      description: '7-in-1 USB-C hub with HDMI, USB-A, SD card',
      price: 49.99,
      categoryId: 'cat-001',
      images: ['https://via.placeholder.com/600'],
      variants: [],
      inventory: 0,
      tags: ['accessories', 'usb'],
      isActive: true,
      isFeatured: false,
      rating: 4.0,
      reviewCount: 45,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
    },
  ];
  await products.insertMany(productData);

  // Seed users
  const passwordHash =
    '$argon2id$v=19$m=19456,t=2,p=1$test-salt$test-hash'; // password: "testpassword123"
  const userData: User[] = [
    {
      _id: 'user-customer-001',
      email: 'customer@test.com',
      passwordHash,
      name: 'Test Customer',
      role: 'customer',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      _id: 'user-admin-001',
      email: 'admin@test.com',
      passwordHash,
      name: 'Test Admin',
      role: 'admin',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ];
  await users.insertMany(userData);

  return { users: userData, products: productData, category };
}

// Global setup
beforeAll(async () => {
  await setupTestInfra();
  await seedTestData(testDb);
});

afterAll(async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  if (redisMock) {
    redisMock.disconnect();
  }
});

export { setupTestInfra, seedTestData };
