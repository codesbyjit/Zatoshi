/**
 * Seed Order Data Script
 *
 * This script:
 * 1. Deletes all test/bot users except 4 specified ones
 * 2. Creates 5 new bot users with realistic names (last name "Bot")
 * 3. Creates 40-60 orders spread across the last 90 days
 * 4. Provides realistic chart data for analytics endpoints
 *
 * Usage: MONGODB_URI="mongodb://127.0.0.1:27018/ecommerce?replicaSet=rs0&directConnection=true" npx tsx seed-orders.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

// ──────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27018/ecommerce?replicaSet=rs0&directConnection=true';
const SALT_ROUNDS = 10;

// Users to KEEP (all others will be deleted)
const KEEP_EMAILS = [
  'one@one.one',
  'admin@one.one',
  'customer@example.com',
  'admin@example.com',
];

// Bot users to create
const BOT_USERS = [
  { name: 'John Bot', email: 'john.bot@example.com' },
  { name: 'Sarah Bot', email: 'sarah.bot@example.com' },
  { name: 'Mike Bot', email: 'mike.bot@example.com' },
  { name: 'Emily Bot', email: 'emily.bot@example.com' },
  { name: 'David Bot', email: 'david.bot@example.com' },
];

// Order statuses with realistic distribution
const ORDER_STATUSES = [
  { status: 'pending', weight: 5, paymentStatus: 'pending' },
  { status: 'confirmed', weight: 10, paymentStatus: 'paid' },
  { status: 'processing', weight: 15, paymentStatus: 'paid' },
  { status: 'shipped', weight: 20, paymentStatus: 'paid' },
  { status: 'delivered', weight: 40, paymentStatus: 'paid' },
  { status: 'cancelled', weight: 10, paymentStatus: 'refunded' },
];

// Cities/States for shipping addresses
const SHIPPING_LOCATIONS = [
  { city: 'New York', state: 'NY', zip: '10001', country: 'United States' },
  { city: 'Los Angeles', state: 'CA', zip: '90001', country: 'United States' },
  { city: 'Chicago', state: 'IL', zip: '60601', country: 'United States' },
  { city: 'Houston', state: 'TX', zip: '77001', country: 'United States' },
  { city: 'Phoenix', state: 'AZ', zip: '85001', country: 'United States' },
  { city: 'Philadelphia', state: 'PA', zip: '19101', country: 'United States' },
  { city: 'San Antonio', state: 'TX', zip: '78201', country: 'United States' },
  { city: 'San Diego', state: 'CA', zip: '92101', country: 'United States' },
  { city: 'Dallas', state: 'TX', zip: '75201', country: 'United States' },
  { city: 'Austin', state: 'TX', zip: '73301', country: 'United States' },
  { city: 'Portland', state: 'OR', zip: '97201', country: 'United States' },
  { city: 'Seattle', state: 'WA', zip: '98101', country: 'United States' },
  { city: 'Denver', state: 'CO', zip: '80201', country: 'United States' },
  { city: 'Boston', state: 'MA', zip: '02101', country: 'United States' },
  { city: 'Nashville', state: 'TN', zip: '37201', country: 'United States' },
  { city: 'Miami', state: 'FL', zip: '33101', country: 'United States' },
  { city: 'Atlanta', state: 'GA', zip: '30301', country: 'United States' },
  { city: 'Minneapolis', state: 'MN', zip: '55401', country: 'United States' },
  { city: 'Detroit', state: 'MI', zip: '48201', country: 'United States' },
  { city: 'Raleigh', state: 'NC', zip: '27601', country: 'United States' },
];

const STREETS = [
  '123 Main St',
  '456 Oak Ave',
  '789 Elm St',
  '321 Pine Rd',
  '654 Maple Dr',
  '987 Cedar Ln',
  '147 Birch Blvd',
  '258 Walnut Way',
  '369 Cherry Ct',
  '741 Spruce St',
  '852 Ash Ave',
  '963 Willow Dr',
  '159 Poplar Pl',
  '357 Magnolia Cir',
  '468 Sycamore Dr',
];

const PHONE_PREFIXES = [
  '212',
  '310',
  '312',
  '713',
  '602',
  '215',
  '210',
  '619',
  '214',
  '512',
  '503',
  '206',
  '303',
  '617',
  '615',
  '305',
  '404',
  '612',
  '313',
  '919',
];

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

function roundToCent(n: number): number {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────
// Main
// ──────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log(`Connected to database: ${db.databaseName}\n`);

  // ── Step 1: Delete all users except the 4 we want to keep ──
  const usersCollection = db.collection('users');
  const beforeDelete = await usersCollection.countDocuments();
  console.log(`Users before cleanup: ${beforeDelete}`);

  const deleteResult = await usersCollection.deleteMany({
    email: { $nin: KEEP_EMAILS },
  });
  console.log(`Deleted ${deleteResult.deletedCount} test/bot users.`);

  const afterDelete = await usersCollection.countDocuments();
  console.log(`Users after cleanup: ${afterDelete}`);

  // List the kept users
  const keptUsers = await usersCollection
    .find({ email: { $in: KEEP_EMAILS } })
    .project({ email: 1, name: 1, role: 1, _id: 1 })
    .toArray();
  for (const u of keptUsers) {
    console.log(`  Kept: ${u.email} (${u.role}) — _id: ${u._id.toString()}`);
  }

  // ── Step 2: Create 5 bot users ──
  console.log(`\nCreating ${BOT_USERS.length} bot users...`);
  const passwordHash = await bcrypt.hash('customer123', SALT_ROUNDS);
  const now = new Date();
  const botUserIds: ObjectId[] = [];

  for (const bot of BOT_USERS) {
    // Use ObjectId for _id to match the seeded pattern
    const oid = new ObjectId();
    botUserIds.push(oid);

    await usersCollection.insertOne({
      _id: oid,
      email: bot.email,
      passwordHash,
      name: bot.name,
      role: 'customer',
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  Created: ${bot.name} <${bot.email}> — _id: ${oid.toString()}`);
  }

  const afterInsert = await usersCollection.countDocuments();
  console.log(`Users after insert: ${afterInsert}`);

  // ── Step 3: Fetch all products for order items ──
  const productsCollection = db.collection('products');
  const products = await productsCollection.find({}).toArray();
  console.log(`\nAvailable products: ${products.length}`);

  // ── Step 4: Generate orders spread across 90 days ──
  console.log(`\nGenerating orders for bot users...`);

  const ordersCollection = db.collection('orders');
  const now_ts = now.getTime();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const startDate = new Date(now_ts - NINETY_DAYS_MS);

  // Orders per bot user: 8-12 each = 40-60 total
  const orderRanges = [8, 9, 10, 11, 12];
  const ordersPerUser = botUserIds.map(() => pick(orderRanges));
  let orderIdCounter = Date.now();

  const allOrders: any[] = [];

  for (let uIdx = 0; uIdx < botUserIds.length; uIdx++) {
    const userId = botUserIds[uIdx];
    const numOrders = ordersPerUser[uIdx];

    // Generate timestamps spread across the 90 days, with later dates having more density
    const timestamps: number[] = [];
    for (let o = 0; o < numOrders; o++) {
      // Use beta distribution to skew towards recent dates
      // Simple approach: use random with quadratic skew
      const t = Math.random(); // 0-1
      // Skew towards recent: cube the random value so most are in recent part
      const skew = Math.pow(t, 1.5); // subtle skew
      const offset = skew * NINETY_DAYS_MS;
      timestamps.push(now_ts - offset);
    }

    // Sort timestamps so earlier orders come first
    timestamps.sort((a, b) => a - b);

    const userBotInfo = BOT_USERS[uIdx];

    for (let oIdx = 0; oIdx < numOrders; oIdx++) {
      const orderDate = new Date(timestamps[oIdx]);

      // Pick 1-4 items for this order
      const numItems = randInt(1, 4);
      const items: any[] = [];
      const usedProductIndices = new Set<number>();

      for (let i = 0; i < numItems; i++) {
        let pIdx: number;
        do {
          pIdx = randInt(0, products.length - 1);
        } while (usedProductIndices.has(pIdx));
        usedProductIndices.add(pIdx);

        const product = products[pIdx];
        const quantity = randInt(1, 3);
        const price = product.price;

        items.push({
          productId: product._id, // ObjectId from products collection
          variantInfo: 'Default',
          name: product.name,
          price,
          quantity,
          image: product.images?.[0] || '',
        });
      }

      // Calculate financials
      const subtotal = roundToCent(
        items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
      );
      const shippingCost = roundToCent(4.99 + Math.random() * 5.01); // $4.99 - $10.00
      const taxRate = 0.08 + Math.random() * 0.02; // 8-10%
      const tax = roundToCent(subtotal * taxRate);
      const total = roundToCent(subtotal + shippingCost + tax);

      // Pick status based on weighted distribution
      const { status, paymentStatus } = weightedPick(ORDER_STATUSES);

      // Pick shipping location
      const loc = pick(SHIPPING_LOCATIONS);
      const street = pick(STREETS);
      const phonePrefix = pick(PHONE_PREFIXES);

      // Split bot name into first/last
      const [firstName, lastName] = userBotInfo.name.split(' ');

      // Generate unique order number
      orderIdCounter++;
      const orderNumber = `ORD-${String(orderIdCounter).slice(-8)}`;

      // Generate idempotency key
      const idempotencyKey = `seed-${orderIdCounter}-${Math.random().toString(36).slice(2, 8)}`;

      const createdAt = orderDate;
      const updatedAt = new Date(
        createdAt.getTime() +
          randInt(1, 72) * 60 * 60 * 1000 + // 1-72 hours later
          randInt(0, 59) * 60 * 1000,
      );

      const order = {
        _id: new ObjectId(), // Use ObjectId for order _id
        orderNumber,
        userId, // ObjectId referencing bot user
        status,
        items,
        shippingAddress: {
          firstName,
          lastName,
          street,
          city: loc.city,
          state: loc.state,
          zip: loc.zip,
          country: loc.country,
          phone: `${phonePrefix}-${randInt(200, 999)}-${randInt(1000, 9999)}`,
        },
        subtotal,
        shippingCost,
        tax,
        total,
        paymentStatus,
        idempotencyKey,
        notes: null,
        createdAt,
        updatedAt,
      };

      allOrders.push(order);
    }
  }

  // Insert all orders
  if (allOrders.length > 0) {
    await ordersCollection.insertMany(allOrders);
  }
  console.log(`Inserted ${allOrders.length} orders for ${botUserIds.length} bot users.`);

  // ── Summary ──
  const totalUsers = await usersCollection.countDocuments();
  const totalOrders = await ordersCollection.countDocuments();
  const totalProducts = await productsCollection.countDocuments();

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ SEED COMPLETE');
  console.log(`${'='.repeat(60)}`);
  console.log(`   Users:     ${totalUsers}`);
  console.log(`   Products:  ${totalProducts}`);
  console.log(`   Orders:    ${totalOrders}`);

  // Show orders per user
  console.log(`\n   Orders per bot user:`);
  for (let i = 0; i < botUserIds.length; i++) {
    const botEmail = BOT_USERS[i].email;
    const userOrders = allOrders.filter((o: any) =>
      o.userId.equals ? o.userId.equals(botUserIds[i]) : o.userId === botUserIds[i].toString(),
    );
    const totalRevenue = userOrders.reduce((sum: number, o: any) => sum + o.total, 0);
    console.log(
      `     ${BOT_USERS[i].name} <${botEmail}>: ${userOrders.length} orders — $${totalRevenue.toFixed(2)} total`,
    );
  }

  // Show order status distribution
  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }
  console.log(`\n   Order status distribution:`);
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`     ${status}: ${count}`);
  }

  // Show date range
  const dates = allOrders.map((o: any) => o.createdAt).sort((a: Date, b: Date) => a.getTime() - b.getTime());
  if (dates.length > 0) {
    console.log(`\n   Date range:`);
    console.log(`     First order: ${dates[0].toISOString()}`);
    console.log(`     Last order:  ${dates[dates.length - 1].toISOString()}`);
  }

  await client.close();
  console.log(`\nDone.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
