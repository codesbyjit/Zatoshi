/**
 * Seed Recommendation Data Script
 *
 * Seeds:
 * - Sample product analytics (views, clicks, purchases)
 * - User activity (recently viewed, search history, click history)
 * - Product reviews (10-15 products, multiple users, varied ratings)
 *
 * Usage: MONGODB_URI="mongodb://127.0.0.1:27018/ecommerce?replicaSet=rs0&directConnection=true" npx tsx seed-recommendations.ts
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27018/ecommerce?replicaSet=rs0&directConnection=true';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  return new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
}

const REVIEW_TITLES = [
  'Great product, highly recommend!',
  'Decent quality for the price',
  'Exceeded my expectations',
  'Not what I expected',
  'Perfect gift idea',
  'Solid build quality',
  'Good but could be better',
  'Outstanding value',
  'Would buy again',
  'Average at best',
  'Top notch quality',
  'Disappointed with purchase',
  'Exactly as described',
  'Better than expected',
  'My new favorite',
];

const REVIEW_BODIES = [
  'I have been using this for a few weeks now and I am very impressed with the quality. The materials feel premium and it performs exactly as advertised.',
  'For the price point, this is an excellent option. While it may not be the absolute best on the market, it offers great value and meets all my basic needs.',
  'Ordered this as a gift and the recipient loved it. The packaging was nice and the product itself looks and feels high quality. Fast shipping too!',
  'The product is okay but there are some minor issues. The build quality is decent but I expected better finishing based on the description and photos.',
  'This has become an essential part of my daily routine. The design is thoughtful and the quality is consistent. Highly recommend to anyone considering it.',
  'Solid product overall. The materials used are good and it feels durable. The only reason I am not giving 5 stars is the color was slightly different in person.',
  'Good quality and fast delivery. The product met my expectations and works as described. Would definitely consider buying from this brand again.',
  'One of the best purchases I have made this year. The attention to detail is remarkable and the customer service was excellent when I had a question.',
  'Very happy with this purchase. It arrived earlier than expected and was well-packaged. The product itself is well-made and functions perfectly.',
  'I had high hopes but unfortunately this fell short. The concept is great but the execution could use some improvement. Might work better for others though.',
];

const USERS: Array<{ name: string; email: string; _id?: string }> = [
  { name: 'Alice Johnson', email: 'alice@example.com' },
  { name: 'Bob Smith', email: 'bob@example.com' },
  { name: 'Carol Williams', email: 'carol@example.com' },
  { name: 'Dave Brown', email: 'dave@example.com' },
  { name: 'Eve Davis', email: 'eve@example.com' },
  { name: 'Frank Miller', email: 'frank@example.com' },
  { name: 'Grace Wilson', email: 'grace@example.com' },
  { name: 'Henry Moore', email: 'henry@example.com' },
  { name: 'Ivy Taylor', email: 'ivy@example.com' },
  { name: 'Jack Anderson', email: 'jack@example.com' },
];

const CATEGORIES = [
  'electronics', 'clothing', 'home-garden', 'books',
  'sports', 'beauty', 'food-drinks', 'toys', 'music', 'automotive',
];

async function main(): Promise<void> {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log(`Connected to database: ${db.databaseName}\n`);

  const products = await db.collection('products').find({}).toArray();
  console.log(`Found ${products.length} products\n`);

  // ── 1. Seed Product Analytics ──
  console.log('1. Seeding product analytics...');
  const analyticsCol = db.collection('product_analytics');
  await analyticsCol.deleteMany({});

  const analyticsDocs = [];
  for (const product of products) {
    const viewCount = randInt(10, 5000);
    analyticsDocs.push({
      _id: product._id.toString(),
      productId: product._id.toString(),
      totalViews: viewCount,
      uniqueViews: Math.floor(viewCount * 0.4),
      productClicks: randInt(5, 1000),
      addToCartCount: randInt(1, 200),
      removeFromCartCount: randInt(0, 50),
      wishlistCount: randInt(0, 100),
      purchases: randInt(0, 50),
      orderCount: randInt(0, 40),
      searchCount: randInt(0, 100),
      shareCount: randInt(0, 30),
      avgTimeSpent: Math.random() * 120,
      bounceRate: Math.random() * 0.6,
      conversionRate: Math.random() * 0.15,
      productRating: product.rating || +(Math.random() * 5).toFixed(1),
      ratingCount: randInt(0, 200),
      reviewCount: randInt(0, 100),
      trendingScore: Math.random() * 100,
      popularityScore: Math.random() * 100,
      lastViewedAt: randomDate(7),
      lastPurchasedAt: Math.random() > 0.5 ? randomDate(30) : undefined,
      createdAt: randomDate(90),
      updatedAt: randomDate(7),
    });
  }

  await analyticsCol.insertMany(analyticsDocs);
  console.log(`   Inserted ${analyticsDocs.length} product analytics records\n`);

  // ── 2. Seed User Activity ──
  console.log('2. Seeding user activity...');
  const activityCol = db.collection('user_activity');
  await activityCol.deleteMany({});

  for (const user of USERS) {
    const recentlyViewed: any[] = [];
    const numViewed = randInt(3, 15);
    const viewedSet = new Set<string>();
    for (let i = 0; i < numViewed; i++) {
      const product = pick(products);
      const pid = product._id.toString();
      if (viewedSet.has(pid)) continue;
      viewedSet.add(pid);
      recentlyViewed.push({
        productId: pid,
        productName: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        viewedAt: randomDate(14),
      });
    }

    const searchQueries = [
      'wireless headphones', 'running shoes', 'yoga mat',
      'coffee beans', 'desk lamp', 'mechanical keyboard',
      'yoga leggings', 'protein bars', 'face moisturizer',
      'garden tools', 'board games', 'acoustic guitar',
    ];
    const searchHistory: any[] = [];
    const numSearches = randInt(2, 8);
    for (let i = 0; i < numSearches; i++) {
      searchHistory.push({
        query: pick(searchQueries),
        timestamp: randomDate(14),
      });
    }

    const clickHistory: any[] = [];
    const numClicks = randInt(5, 20);
    for (let i = 0; i < numClicks; i++) {
      clickHistory.push({
        productId: pick(products)._id.toString(),
        timestamp: randomDate(7),
      });
    }

    const purchasedProducts = products
      .sort(() => Math.random() - 0.5)
      .slice(0, randInt(0, 5));

    const categoryInterests: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      categoryInterests[cat] = Math.floor(Math.random() * 10);
    }

    const activityDoc = {
      _id: user.email,
      recentlyViewed,
      searchHistory,
      clickHistory,
      browsingHistory: [],
      wishlist: [],
      cart: [],
      orders: [],
      purchases: purchasedProducts.map((p) => p._id.toString()),
      categoryInterests,
      brandInterests: {},
      pricePreferences: {
        min: Math.floor(Math.random() * 50),
        max: Math.floor(50 + Math.random() * 200),
      },
      device: pick(['desktop', 'mobile', 'tablet']),
      sessionDuration: randInt(60, 3600),
      lastActive: randomDate(1),
      preferredCategories: CATEGORIES.sort(() => Math.random() - 0.5).slice(0, 3),
      preferredBrands: [],
      createdAt: randomDate(90),
      updatedAt: randomDate(1),
    };

    await activityCol.insertOne(activityDoc);
  }
  console.log(`   Inserted activity data for ${USERS.length} users\n`);

  // ── 3. Seed Reviews ──
  console.log('3. Seeding reviews...');
  const reviewsCol = db.collection('reviews');
  await reviewsCol.deleteMany({});

  // Select 10-15 products with good distribution across categories
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
  const reviewProductCount = randInt(10, 15);
  const reviewProducts = shuffledProducts.slice(0, reviewProductCount);
  let reviewCount = 0;

  for (const product of reviewProducts) {
    const numReviews = randInt(2, 6);
    const reviewers = USERS.sort(() => Math.random() - 0.5).slice(0, numReviews);

    for (const reviewer of reviewers) {
      const ratingWeighted = (() => {
        const r = Math.random();
        if (r < 0.1) return randInt(1, 2);
        if (r < 0.3) return 3;
        if (r < 0.6) return 4;
        return 5;
      })();

      const review = {
        _id: new ObjectId().toString(),
        userId: reviewer.email,
        productId: product._id.toString(),
        rating: ratingWeighted,
        title: pick(REVIEW_TITLES),
        review: pick(REVIEW_BODIES),
        images: [],
        verifiedPurchase: Math.random() > 0.3,
        helpfulCount: randInt(0, 25),
        reportCount: Math.random() > 0.9 ? randInt(1, 3) : 0,
        createdAt: randomDate(60),
        updatedAt: randomDate(30),
      };

      await reviewsCol.insertOne(review);
      reviewCount++;
    }
  }
  console.log(`   Inserted ${reviewCount} reviews across ${reviewProductCount} products\n`);

  // ── Summary ──
  const totalAnalytics = await analyticsCol.countDocuments();
  const totalActivity = await activityCol.countDocuments();
  const totalReviews = await reviewsCol.countDocuments();

  console.log('='.repeat(60));
  console.log('✅ RECOMMENDATION SEED COMPLETE');
  console.log('='.repeat(60));
  console.log(`   Product analytics: ${totalAnalytics}`);
  console.log(`   User activity:     ${totalActivity}`);
  console.log(`   Reviews:           ${totalReviews}`);
  console.log(`   Users:             ${USERS.length}`);

  await client.close();
  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
