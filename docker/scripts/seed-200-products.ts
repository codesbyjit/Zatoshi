/**
 * Seed ~200 Products with Complete Recommendation Analytics Data
 *
 * Seeds:
 * - 200 new products across 10 categories (20 per category)
 * - Product analytics for ALL products (existing + new)
 * - Reviews for new products (50-100 reviews)
 * - User activity updates (recently viewed, category interests)
 *
 * Usage: npx tsx docker/scripts/seed-200-products.ts
 *
 * Prerequisites:
 * - MongoDB replica set running at MONGODB_URI
 * - Existing products, categories, and users already seeded
 */

import { MongoClient, ObjectId, Int32 } from 'mongodb';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27018/ecommerce?replicaSet=rs0&directConnection=true';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  return new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
}

function weightedRating(): number {
  const r = Math.random();
  if (r < 0.05) return randInt(1, 2);
  if (r < 0.15) return 3;
  if (r < 0.45) return 4;
  return 5;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ──────────────────────────────────────────
// Category → _id mapping (fetched at runtime)
// ──────────────────────────────────────────

const CATEGORY_SLUGS = [
  'electronics', 'clothing', 'home-garden', 'books', 'sports',
  'beauty', 'food-drinks', 'toys', 'music', 'automotive',
];

// ──────────────────────────────────────────
// Review data (matches seed-recommendations.ts style)
// ──────────────────────────────────────────

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
  'Amazing quality for the money. I have recommended this to all my friends and family. Will definitely be purchasing more from this brand.',
  'The product works as intended but the packaging could be better. Everything arrived safely but the box was a bit beat up.',
  'Bought this on a whim and it turned out to be one of my best purchases. The quality far exceeds what I expected at this price point.',
  'It is fine for occasional use but I am not sure it will hold up to daily wear. Time will tell but so far it is performing adequately.',
  'I did a lot of research before buying this and I am happy to say it lives up to the hype. Great engineering and thoughtful design throughout.',
];

const USERS: Array<{ name: string; email: string }> = [
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

// ──────────────────────────────────────────
// 200 Product Definitions (20 per category)
// ──────────────────────────────────────────

const SEARCH_QUERIES = [
  'wireless headphones', 'running shoes', 'yoga mat',
  'coffee beans', 'desk lamp', 'mechanical keyboard',
  'yoga leggings', 'protein bars', 'face moisturizer',
  'garden tools', 'board games', 'acoustic guitar',
  'bluetooth speaker', 'smart watch', 'backpack',
  'winter jacket', 'cookware set', 'vitamins',
  'phone case', 'wall art', 'robot vacuum',
];

interface ProductSeed {
  name: string;
  description: string;
  price: number;
  tags: string[];
  hasVariants?: boolean;
}

const PRODUCTS_BY_CATEGORY: Record<string, ProductSeed[]> = {
  // ── Electronics (20 products) ──
  electronics: [
    { name: 'Wireless Charging Station', description: '3-in-1 wireless charging station for phone, watch, and earbuds. 15W fast charging with foldable design and LED indicators.', price: 39.99, tags: ['accessories', 'charging', 'wireless', 'station'] },
    { name: 'Portable Bluetooth Projector', description: 'Mini LED projector with 1080p support, built-in speaker, and HDMI/USB ports. 120-inch projection, perfect for movie nights.', price: 199.99, tags: ['projector', 'portable', '1080p', 'entertainment'] },
    { name: 'Noise-Canceling Earbuds Pro', description: 'Premium true wireless earbuds with adaptive ANC, LDAC support, and 11mm drivers. 40h total battery with case.', price: 179.99, tags: ['audio', 'earbuds', 'noise-cancelling', 'premium'] },
    { name: 'Smart WiFi Light Bulb 4-Pack', description: 'RGBW smart bulbs with 16M colors, dimmable, works with Alexa/Google. 800 lumens, 9W (60W equivalent).', price: 29.99, tags: ['smart-home', 'lighting', 'wifi', 'rgb'] },
    { name: 'USB-C Monitor Hub', description: '15-in-1 USB-C docking station with dual HDMI, 100W PD, Ethernet, SD card, and USB 3.0. Universal laptop companion.', price: 89.99, tags: ['accessories', 'dock', 'usb-c', 'hub'] },
    { name: 'Mechanical Number Pad', description: 'Standalone mechanical numpad with hot-swappable switches, RGB per-key lighting, and USB-C. Programmable macros.', price: 39.99, tags: ['keyboard', 'mechanical', 'numpad', 'rgb'] },
    { name: 'Portable SSD 1TB', description: 'External SSD with 1050MB/s read speed, USB-C, IP65 water resistance. Pocket-sized with keyring loop.', price: 109.99, tags: ['storage', 'ssd', 'portable', 'usb-c'] },
    { name: 'Smart Plug with Energy Monitor', description: 'WiFi smart plug with real-time energy monitoring, scheduling, and away mode. Reports kWh usage in app.', price: 14.99, tags: ['smart-home', 'plug', 'energy', 'wifi'] },
    { name: 'Webcam Cover Slide', description: 'Ultra-thin magnetic webcam cover slide for laptops, monitors, and phones. 0.6mm thick, privacy guarantee.', price: 7.99, tags: ['accessories', 'privacy', 'webcam', 'cover'] },
    { name: 'Graphite Drawing Tablet', description: 'Battery-free pen tablet with 8192 pressure levels, 10x6 inch active area, and programmable express keys.', price: 79.99, tags: ['tablet', 'drawing', 'creative', 'pen'] },
    { name: 'Smart Doorbell Camera', description: 'WiFi video doorbell with 2K resolution, two-way audio, motion detection, and night vision. Works with Alexa.', price: 129.99, tags: ['smart-home', 'doorbell', 'camera', 'security'] },
    { name: 'Cable Management Box', description: 'Large cable management box for power strips. Bamboo lid with ventilation slots, fits up to 10 plugs.', price: 24.99, tags: ['accessories', 'cable', 'organization', 'desk'] },
    { name: 'Laptop Cooling Pad', description: 'Gaming laptop cooler with 6 adjustable fans, RGB lighting, dual USB ports, and ergonomic stand design.', price: 34.99, tags: ['cooling', 'laptop', 'gaming', 'stand'] },
    { name: 'Smart Scale', description: 'Bluetooth body composition scale with 16 metrics including body fat, muscle mass, and bone density. Syncs with fitness apps.', price: 49.99, tags: ['health', 'scale', 'bluetooth', 'fitness'] },
    { name: 'Retro Gaming Console', description: 'Built-in 600 classic games, HDMI output, wireless controllers. Supports save states and game saves. Plug and play.', price: 59.99, tags: ['gaming', 'retro', 'console', 'hdmi'] },
    { name: 'Digital Photo Frame', description: '10-inch IPS WiFi digital frame with 1280x800 resolution. App-controlled, supports video and photo uploads.', price: 89.99, tags: ['frame', 'digital', 'wifi', 'photo'] },
    { name: 'Standing Desk Converter', description: 'Height-adjustable standing desk riser with gas spring, dual monitor support, and keyboard tray. 32-inch wide.', price: 179.99, tags: ['desk', 'ergonomic', 'standing', 'office'] },
    { name: 'Portable Jump Starter', description: '2000A peak car jump starter with USB power bank, LED flashlight, and 12V port. Starts engines up to 8L.', price: 89.99, tags: ['auto', 'jump-starter', 'portable', 'power-bank'] },
    { name: 'Smart Air Purifier', description: 'HEPA air purifier for rooms up to 500 sq ft. PM2.5 sensor, auto mode, quiet sleep mode, and WiFi control.', price: 159.99, tags: ['air-purifier', 'hepa', 'smart', 'health'] },
    { name: 'Robotic Vacuum Cleaner', description: 'LiDAR navigation robot vacuum with 2500Pa suction, mopping function, and auto-empty dock. Maps your home.', price: 399.99, tags: ['vacuum', 'robot', 'smart', 'cleaning'] },
  ],

  // ── Clothing (20 products) ──
  clothing: [
    { name: 'Performance Running Tee', description: 'Moisture-wicking quick-dry running shirt with reflective elements, flatlock seams, and UPF 50+ sun protection.', price: 34.99, tags: ['activewear', 'running', 'performance', 'moisture-wicking'] },
    { name: 'Organic Cotton Hoodie', description: 'Heavyweight organic cotton hoodie with fleece lining, ribbed cuffs, and a kangaroo pocket. Pre-shrunk.', price: 69.99, tags: ['hoodie', 'cotton', 'organic', 'casual'] },
    { name: 'Stretch Chino Shorts', description: 'Cotton-stretch chino shorts with 9-inch inseam, belt loops, and deep pockets. Classic fit for warm weather.', price: 44.99, tags: ['bottoms', 'shorts', 'chino', 'stretch'] },
    { name: 'Merino Wool Base Layer', description: 'Lightweight merino wool crew neck base layer. Temperature regulating, odor resistant, ideal for hiking and travel.', price: 64.99, tags: ['baselayer', 'merino', 'wool', 'hiking'] },
    { name: 'Linen Button-Down Shirt', description: 'Relaxed-fit linen button-down in washed colors. Patch chest pocket, mother-of-pearl buttons, and back pleat.', price: 59.99, tags: ['shirt', 'linen', 'casual', 'summer'] },
    { name: 'Compression Running Tights', description: 'High-waist compression tights with zip pocket, reflective logos, and moisture-wicking fabric. Squat-proof.', price: 54.99, tags: ['activewear', 'tights', 'compression', 'running'] },
    { name: 'Waterproof Rain Jacket', description: 'Lightweight 2.5-layer waterproof jacket with taped seams, adjustable hood, and stuff sack. 10K/10K rating.', price: 129.99, tags: ['outerwear', 'rain', 'waterproof', 'jacket'] },
    { name: 'Cashmere Beanie Hat', description: 'Pure cashmere knit beanie with ribbed fold-over cuff. Ultra-soft and warm. One size fits most.', price: 39.99, tags: ['accessories', 'beanie', 'cashmere', 'winter'] },
    { name: 'Denim Shirt Jacket', description: 'Medium-weight denim shirt jacket with button front, chest pockets, and adjustable cuffs. A timeless layering piece.', price: 78.99, tags: ['outerwear', 'denim', 'shirt-jacket', 'layering'] },
    { name: 'Athletic Crew Socks 6-Pack', description: 'Cushioned crew socks with arch support, reinforced heel/toe, and moisture-wicking yarn. Machine washable.', price: 19.99, tags: ['socks', 'athletic', 'cushioned', 'pack'] },
    { name: 'UV Protection Swim Shirt', description: 'UPF 50+ long sleeve swim shirt with flatlock seams and quick-dry fabric. Ideal for snorkeling and beach days.', price: 29.99, tags: ['swim', 'sun-protection', 'rash-guard', 'beach'] },
    { name: 'Tailored Wool Dress Pants', description: 'Slim-fit dress pants in Italian wool blend. Flat front, zip fly, and unfinished hem for custom tailoring.', price: 99.99, tags: ['formal', 'pants', 'wool', 'tailored'] },
    { name: 'Quilted Vest', description: 'Lightweight quilted vest with diamond stitch pattern and nylon shell. Zip front with stand-up collar.', price: 69.99, tags: ['outerwear', 'vest', 'quilted', 'lightweight'] },
    { name: 'Leather Driving Gloves', description: 'Genuine lambskin leather driving gloves with perforated knuckles and snap closure. Classic driving style.', price: 49.99, tags: ['accessories', 'gloves', 'leather', 'driving'] },
    { name: 'Flannel Pajama Set', description: 'Soft brushed flannel pajama set with button-front top and drawstring pants. Relaxed fit for maximum comfort.', price: 54.99, tags: ['sleepwear', 'flannel', 'set', 'comfort'] },
    { name: 'Wide Leg Linen Trousers', description: 'Flowing wide-leg trousers in washed linen with elastic waist and side pockets. Effortless warm-weather style.', price: 68.99, tags: ['bottoms', 'linen', 'wide-leg', 'summer'] },
    { name: 'Travel Blazer with Wrinkle-Free', description: 'Stretch woven blazer with wrinkle-resistant fabric, internal pockets, and 4-way stretch. Machine washable.', price: 119.99, tags: ['formal', 'blazer', 'travel', 'stretch'] },
    { name: 'Bamboo Fiber Underwear 4-Pack', description: 'Bamboo viscose underwear with 4-way stretch, moisture-wicking, and antibacterial properties. Tagless design.', price: 34.99, tags: ['underwear', 'bamboo', 'pack', 'comfort'] },
    { name: 'Hiking Pants with Zip-Off Legs', description: 'Convertible hiking pants with zip-off legs, UPF 50+, water-resistant finish, and 6 zip pockets.', price: 64.99, tags: ['outdoor', 'hiking', 'pants', 'convertible'] },
    { name: 'Silk Evening Gown', description: 'Elegant silk charmeuse evening gown with cowl neckline and open back. Floor-length for formal occasions.', price: 249.99, tags: ['formal', 'evening', 'silk', 'gown'] },
  ],

  // ── Home & Garden (20 products) ──
  home: [
    { name: 'Memory Foam Bath Mat', description: 'Plush memory foam bath mat with non-slip rubber backing. Machine washable, quick-drying, available in multiple colors.', price: 24.99, tags: ['bath', 'mat', 'memory-foam', 'non-slip'] },
    { name: 'Ceramic Diffuser Set', description: 'Ultrasonic aromatherapy diffuser with color-changing LED, 200ml capacity, auto shut-off. Includes 3 essential oils.', price: 32.99, tags: ['decor', 'diffuser', 'aromatherapy', 'ceramic'] },
    { name: 'Expandable Garden Hose', description: '50-foot expandable garden hose with brass fittings, 3 spray patterns, and leak-proof connections. Lightweight.', price: 34.99, tags: ['garden', 'hose', 'expandable', 'watering'] },
    { name: 'Cast Iron Dutch Oven', description: '6-quart enameled cast iron dutch oven with tight-fitting lid. Oven safe to 500°F. Ideal for slow cooking and bread.', price: 79.99, tags: ['kitchen', 'cooking', 'cast-iron', 'dutch-oven'] },
    { name: 'Succulent Planter Kit', description: 'DIY succulent garden kit with 6 mini succulents, white planter, soil, pebbles, and care guide. 3" pots.', price: 29.99, tags: ['garden', 'succulents', 'planter', 'diy'] },
    { name: 'Mirrored Jewelry Organizer', description: 'Wall-mounted mirrored jewelry cabinet with velvet lining, necklace hooks, ring rolls, and earring panels.', price: 54.99, tags: ['storage', 'jewelry', 'organizer', 'mirror'] },
    { name: 'Bamboo Kitchen Utensil Set', description: '10-piece bamboo kitchen utensil set with spatula, spoon, tongs, turner, and carousel stand. Naturally antimicrobial.', price: 27.99, tags: ['kitchen', 'utensils', 'bamboo', 'set'] },
    { name: 'Outdoor Solar Lanterns', description: 'Set of 4 HEPA solar powered lanterns with warm LED light, rust-proof aluminum, and auto dusk-to-dawn sensor.', price: 44.99, tags: ['lighting', 'solar', 'lanterns', 'outdoor'] },
    { name: 'Non-Stick Pancake Griddle', description: '11-inch round non-stick electric griddle with adjustable temperature control and cool-touch handle. Perfect for breakfast.', price: 29.99, tags: ['kitchen', 'griddle', 'non-stick', 'electric'] },
    { name: 'Decorative Throw Blanket', description: 'Ultra-soft microfiber throw blanket with reversible design and knitted fringe. 50x70 inches, machine washable.', price: 34.99, tags: ['decor', 'blanket', 'microfiber', 'cozy'] },
    { name: 'Wall Mounted Herb Dryer', description: 'Rustic wall-mounted herb drying rack with 5 clips, adjustable arms, and artisan-crafted pine wood construction.', price: 21.99, tags: ['garden', 'herbs', 'drying', 'wall-mount'] },
    { name: 'Glass Food Storage Set', description: '18-piece borosilicate glass food storage set with bamboo lids and silicone seals. Oven, microwave, dishwasher safe.', price: 38.99, tags: ['kitchen', 'storage', 'glass', 'bpa-free'] },
    { name: 'Compartment Laundry Hamper', description: '3-compartment laundry sorter with removable bags, steel frame, and lid. Keeps whites, darks, and delicates separate.', price: 49.99, tags: ['laundry', 'hamper', 'sorter', 'organization'] },
    { name: 'Bird Feeder with Camera', description: 'Solar-powered bird feeder with built-in 1080p camera and motion detection. Watch birds live via app. Weatherproof.', price: 79.99, tags: ['garden', 'bird-feeder', 'camera', 'solar'] },
    { name: 'Scented Wax Warmer', description: 'Electric wax warmer with adjustable light settings, timer, and auto shut-off. Uses standard wax melts.', price: 19.99, tags: ['decor', 'wax-warmer', 'electric', 'scented'] },
    { name: 'Over-the-Sink Dish Drying Rack', description: 'Adjustable dish drying rack that sits over your sink, saving counter space. Stainless steel with foldable arms.', price: 35.99, tags: ['kitchen', 'drying-rack', 'stainless', 'space-saving'] },
    { name: 'Indoor Garden Light Stand', description: 'Tiered plant stand with 4 adjustable shelves and built-in LED grow lights. Auto timer, 3 light modes.', price: 69.99, tags: ['garden', 'indoor', 'grow-light', 'stand'] },
    { name: 'Self-Watering Planter Pots', description: 'Set of 3 self-watering planters with water indicator, drainage holes, and modern matte finish. 6, 8, 10 inch sizes.', price: 44.99, tags: ['garden', 'planters', 'self-watering', 'indoor'] },
    { name: 'Collapsible Silicone Colander', description: 'BPA-free collapsible silicone colander with heat-resistant handles, fine mesh, and nested design. Saves drawer space.', price: 16.99, tags: ['kitchen', 'colander', 'silicone', 'collapsible'] },
    { name: 'Smart Plant Watering Sensor', description: 'Soil moisture sensor with Bluetooth app, monitors light, temperature, and water levels. Works with indoor and outdoor plants.', price: 12.99, tags: ['garden', 'sensor', 'smart', 'watering'] },
  ],

  // ── Books (20 products) ──
  books: [
    { name: 'Introduction to Algorithms, 4th Ed.', description: 'Comprehensive guide to algorithm design and analysis. Covers dynamic programming, graph algorithms, and NP-completeness.', price: 69.99, tags: ['algorithms', 'computer-science', 'textbook', 'reference'] },
    { name: 'The Pragmatic Programmer', description: 'Timeless tips for becoming a better software developer. Covers career development, project management, and coding practices.', price: 44.99, tags: ['programming', 'career', 'best-practices', 'software'] },
    { name: 'Atomic Habits', description: 'The #1 New York Times bestseller on building good habits and breaking bad ones. A practical guide to lasting change.', price: 16.99, tags: ['self-help', 'habits', 'productivity', 'psychology'] },
    { name: 'Sapiens: A Brief History of Humankind', description: 'A groundbreaking narrative of humanitys creation and evolution that explores how we came to dominate the planet.', price: 18.99, tags: ['history', 'anthropology', 'science', 'bestseller'] },
    { name: 'The Art of War', description: 'Ancient Chinese military treatise by Sun Tzu. Timeless wisdom on strategy, leadership, and conflict. Deluxe hardcover edition.', price: 14.99, tags: ['philosophy', 'strategy', 'military', 'classic'] },
    { name: 'Python Crash Course, 3rd Ed.', description: 'The fast-paced introduction to Python programming. Covers fundamentals, projects, and real-world applications.', price: 39.99, tags: ['programming', 'python', 'beginners', 'tutorial'] },
    { name: 'Thinking, Fast and Slow', description: 'Nobel Prize winner Daniel Kahnemans exploration of the two systems that drive our thoughts and decision-making.', price: 17.99, tags: ['psychology', 'behavioral-economics', 'cognition', 'non-fiction'] },
    { name: 'Dune', description: 'Frank Herberts epic science fiction masterpiece set on the desert planet Arrakis. A story of politics, religion, and ecology.', price: 12.99, tags: ['sci-fi', 'classic', 'epic', 'fiction'] },
    { name: 'The Design of Everyday Things', description: 'Don Normans classic on design principles. Explains why some products satisfy while others frustrate.', price: 22.99, tags: ['design', 'usability', 'product-design', 'psychology'] },
    { name: 'The Silk Roads: A New World History', description: 'A major reassessment of world history by Peter Frankopan, centering on the Silk Roads that connected East and West.', price: 19.99, tags: ['history', 'world', 'economics', 'culture'] },
    { name: 'Deep Work: Rules for Focused Success', description: 'Cal Newports guide to cultivating deep focus in a distracted world. Essential for knowledge workers.', price: 15.99, tags: ['productivity', 'focus', 'career', 'self-help'] },
    { name: 'The Great Gatsby', description: 'F. Scott Fitzgeralds masterpiece of the Jazz Age. A story of love, wealth, and the American Dream. Annotated edition.', price: 11.99, tags: ['classic', 'fiction', 'american', 'literature'] },
    { name: 'The Lean Startup', description: 'Eric Ries methodology for building successful startups through continuous innovation and validated learning.', price: 24.99, tags: ['business', 'startup', 'entrepreneurship', 'innovation'] },
    { name: 'A Brief History of Time', description: 'Stephen Hawkings landmark exploration of cosmology, black holes, and the nature of the universe. Accessible and profound.', price: 13.99, tags: ['science', 'physics', 'cosmology', 'universe'] },
    { name: 'Meditations', description: 'Marcus Aurelius timeless stoic philosophy. A series of personal writings on virtue, discipline, and wisdom.', price: 10.99, tags: ['philosophy', 'stoicism', 'classic', 'wisdom'] },
    { name: 'Cracking the Coding Interview', description: '189 programming questions and solutions for landing a top tech job. Covers algorithms, data structures, and system design.', price: 35.99, tags: ['interview', 'programming', 'algorithms', 'career'] },
    { name: 'The Hobbit', description: 'J.R.R. Tolkiens classic fantasy adventure. Bilbo Baggins journey to the Lonely Mountain. Illustrated edition.', price: 15.99, tags: ['fantasy', 'classic', 'adventure', 'fiction'] },
    { name: 'Clean Architecture', description: 'Robert C. Martins guide to software architecture principles. Dependencies, boundaries, and maintainable design.', price: 39.99, tags: ['architecture', 'programming', 'design', 'software'] },
    { name: 'Educated: A Memoir', description: 'Tara Westovers unforgettable memoir of growing up in a survivalist family and her journey to education.', price: 15.99, tags: ['memoir', 'education', 'inspirational', 'bestseller'] },
    { name: 'The Catcher in the Rye', description: 'J.D. Salingers iconic novel of teenage angst and alienation. A must-read classic of American literature.', price: 10.99, tags: ['classic', 'fiction', 'coming-of-age', 'american'] },
  ],

  // ── Sports (20 products) ──
  sports: [
    { name: 'Pilates Reformers Machine', description: 'Compact home pilates reformer with adjustable resistance, carriage, and shoulder rests. Folds for easy storage.', price: 299.99, tags: ['pilates', 'home-gym', 'resistance', 'fitness'] },
    { name: 'Pull-Up Bar Doorway', description: 'Install pull-up bar in seconds, no drilling. Extra-wide grip positions, padded handles, holds up to 300 lbs.', price: 29.99, tags: ['strength', 'pull-up', 'home-gym', 'calisthenics'] },
    { name: 'Adjustable Kettlebell', description: 'Space-saving adjustable kettlebell from 8-32 lbs with quick-change dial. Compact design with wide handle.', price: 79.99, tags: ['strength', 'kettlebell', 'adjustable', 'home-gym'] },
    { name: 'Yoga Block Set with Strap', description: 'Set of 2 cork yoga blocks and 8ft cotton yoga strap with D-ring. Eco-friendly, non-slip, and durable.', price: 22.99, tags: ['yoga', 'blocks', 'strap', 'accessories'] },
    { name: 'Jump Rope with Counter', description: 'Speed jump rope with electronic counter, ball bearings, adjustable steel cable, and foam grips.', price: 19.99, tags: ['cardio', 'jump-rope', 'fitness', 'counter'] },
    { name: 'Hypersoft Foam Roller', description: '18-inch foam roller with textured surface for deep tissue massage. High-density EVA foam, 500 lb capacity.', price: 22.99, tags: ['recovery', 'foam-roller', 'massage', 'muscle'] },
    { name: 'Insulated Lunch Cooler Bag', description: 'Large insulated lunch bag with leak-proof lining, front zip pocket, and adjustable shoulder strap. Holds 12 cans.', price: 18.99, tags: ['hydration', 'cooler', 'lunch', 'portable'] },
    { name: 'Ab Roller Wheel Kit', description: 'Ab roller with knee pad mat, spring resistance bands, and ergonomic handles. Targets core, arms, and shoulders.', price: 26.99, tags: ['core', 'ab-roller', 'home-gym', 'strength'] },
    { name: 'Swimming Waterproof MP3 Player', description: '8GB waterproof MP3 player with bone conduction earphones. Swim at depths up to 3m. Plays MP3, WMA, FLAC.', price: 59.99, tags: ['swimming', 'music', 'waterproof', 'headphones'] },
    { name: 'Adjustable Ankle Weights', description: 'Adjustable ankle/wrist weights from 1-5 lbs each. Sand-filled, neoprene fabric with secure Velcro straps.', price: 24.99, tags: ['strength', 'weights', 'ankle', 'aerobic'] },
    { name: 'Cycling Water Bottle Cage', description: 'Aluminum bike water bottle cage with secure grip design. Weighs 30g, fits standard bottles. Mounting hardware included.', price: 9.99, tags: ['cycling', 'bottle-cage', 'lightweight', 'aluminum'] },
    { name: 'Punching Bag Stand Set', description: 'Free-standing punching bag with height adjustment, foam-filled bag, and built-in speed ball. Filled base for stability.', price: 149.99, tags: ['boxing', 'punching-bag', 'martial-arts', 'home-gym'] },
    { name: 'Compact Elliptical Machine', description: 'Under-desk elliptical with 8 resistance levels, LCD display, and remote control. Quiet magnetic resistance.', price: 129.99, tags: ['cardio', 'elliptical', 'under-desk', 'compact'] },
    { name: 'Volleyball Set with Net', description: 'Portable badminton/volleyball combo set with adjustable net, poles, ground stakes, and carrying bag. Includes 2 rackets.', price: 39.99, tags: ['volleyball', 'outdoor', 'net', 'set'] },
    { name: 'Compression Knee Sleeves', description: 'Pair of neoprene knee sleeves with reinforced stitching and patella gel ring. Supports heavy lifting and recovery.', price: 34.99, tags: ['strength', 'knee-support', 'compression', 'lifting'] },
    { name: 'Tennis Racquet Starter Set', description: 'Lightweight aluminum tennis racquet with dampener, grip tape, and carry bag. Pre-strung and ready to play.', price: 49.99, tags: ['tennis', 'racquet', 'starter', 'outdoor'] },
    { name: 'HIIT Timer Interval Watch', description: 'Water-resistant interval timer watch with preset HIIT programs, vibration alerts, and stopwatch. Gym essential.', price: 17.99, tags: ['fitness', 'timer', 'hiit', 'watch'] },
    { name: 'Balance Board Trainer', description: 'Wooden balance board with non-slip surface, adjustable rocker limit, and exercise guide. Improves stability.', price: 39.99, tags: ['balance', 'training', 'core', 'stability'] },
    { name: 'Sweat-Proof Gym Towel', description: 'Microfiber gym towel 30x60 inches with silicone grip corners. Quick-drying, antibacterial, and machine washable.', price: 14.99, tags: ['gym', 'towel', 'microfiber', 'sweat'] },
    { name: 'Wrist Wraps for Lifting', description: 'Cotton wrist wraps with thumb loop and 18-inch length. Provides support for heavy bench press and overhead press.', price: 12.99, tags: ['strength', 'wrist-wraps', 'lifting', 'support'] },
  ],

  // ── Beauty (20 products) ──
  beauty: [
    { name: 'Vitamin C Brightening Serum', description: '20% vitamin C serum with hyaluronic acid and vitamin E. Reduces dark spots, brightens skin tone. 30ml dropper bottle.', price: 28.99, tags: ['skincare', 'serum', 'vitamin-c', 'brightening'] },
    { name: 'Retinol Night Cream', description: 'Anti-aging night cream with 0.5% retinol, peptides, and ceramides. Improves fine lines and skin texture.', price: 36.99, tags: ['skincare', 'night-cream', 'retinol', 'anti-aging'] },
    { name: 'Charcoal Face Mask Stick', description: 'Charcoal-infused face mask in stick form for mess-free application. Deep cleans pores, removes impurities.', price: 14.99, tags: ['skincare', 'mask', 'charcoal', 'cleansing'] },
    { name: 'Heatless Hair Curlers Set', description: 'Silk heatless curling rod set with satin scrunchies and claw clips. Perfect overnight curls without heat damage.', price: 22.99, tags: ['hair-care', 'curlers', 'heatless', 'silk'] },
    { name: 'Natural Deodorant Cream', description: 'Aluminum-free natural deodorant with coconut oil, shea butter, and essential oils. 2oz jar, lasts 2+ months.', price: 12.99, tags: ['body-care', 'deodorant', 'natural', 'aluminum-free'] },
    { name: 'Eyebrow Defining Kit', description: 'Complete eyebrow kit with stencils, powder, wax, mini brush, and tweezers. Create perfect brows in minutes.', price: 18.99, tags: ['makeup', 'eyebrows', 'kit', 'defining'] },
    { name: 'Rosewater Face Mist', description: 'Natural rosewater facial mist with glycerin and aloe vera. Hydrating, calming, and perfect for makeup setting.', price: 11.99, tags: ['skincare', 'mist', 'rosewater', 'hydrating'] },
    { name: 'Electric Callus Remover', description: 'Rechargeable electronic foot file with 2 speed settings and 2 roller heads. Removes dead skin safely and painlessly.', price: 24.99, tags: ['foot-care', 'callus', 'electric', 'exfoliating'] },
    { name: 'Lip Sleeping Mask', description: 'Overnight lip treatment with shea butter and vitamin C. Intense hydration for soft, smooth lips by morning.', price: 16.99, tags: ['lip-care', 'mask', 'sleeping', 'hydration'] },
    { name: 'Hair Growth Serum', description: 'Leave-in hair serum with biotin, castor oil, and rosemary. Strengthens follicles and promotes fuller-looking hair.', price: 26.99, tags: ['hair-care', 'serum', 'growth', 'biotin'] },
    { name: 'Makeup Sponge Set', description: '6-piece cruelty-free makeup sponge set with different shapes for precise application. Ultra-soft, latex-free.', price: 9.99, tags: ['makeup', 'sponges', 'blender', 'set'] },
    { name: 'Beard Grooming Kit', description: 'Complete beard care set with oil, balm, brush, comb, and scissors. All natural ingredients, sandalwood scent.', price: 29.99, tags: ['grooming', 'beard', 'kit', 'men'] },
    { name: 'Nail Art Stamping Kit', description: 'DIY nail art stamping kit with 20 image plates, stamper, scraper, and 6 polishes. Salon-quality designs at home.', price: 19.99, tags: ['nails', 'stamping', 'art', 'diy'] },
    { name: 'Sun Protection Face SPF 50', description: 'Mineral face sunscreen with SPF 50, zinc oxide, and niacinamide. Lightweight, no white cast, reef-safe.', price: 21.99, tags: ['sunscreen', 'spf', 'face', 'mineral'] },
    { name: 'Teeth Whitening Pen', description: 'Portable teeth whitening pen with 35% carbamide peroxide gel. Visible results in 7 days. Easy apply, no mess.', price: 15.99, tags: ['oral-care', 'whitening', 'teeth', 'pen'] },
    { name: 'Scalp Massage Brush', description: 'Silicone scalp massager with soft flexible bristles. Stimulates hair growth, exfoliates scalp, great for shower use.', price: 8.99, tags: ['hair-care', 'scalp', 'massager', 'silicone'] },
    { name: 'Eyelash Curler Kit', description: 'Professional eyelash curler with 3 replacement pads, mini curler, and lash comb. Ergonomic stainless steel.', price: 13.99, tags: ['makeup', 'eyelash', 'curler', 'tool'] },
    { name: 'Micellar Cleansing Water', description: '500ml micellar water with micelle technology. Removes makeup and cleanses without rinsing. Suitable for sensitive skin.', price: 11.99, tags: ['skincare', 'cleanser', 'micellar', 'makeup-remover'] },
    { name: 'Dry Brush for Skin', description: 'Natural boar bristle dry brush with bamboo handle. Stimulates circulation, exfoliates skin, reduces cellulite appearance.', price: 16.99, tags: ['body-care', 'dry-brushing', 'exfoliation', 'circulation'] },
    { name: 'Facial Steamer', description: 'Nano-ionic facial steamer with adjustable steam control and auto shut-off. Opens pores, boosts serum absorption.', price: 34.99, tags: ['skincare', 'steamer', 'facial', 'nano-ionic'] },
  ],

  // ── Food & Drinks (20 products) ──
  'food-drinks': [
    { name: 'Cold Brew Coffee Concentrate', description: 'Small-batch cold brew concentrate made from single-origin beans. Rich, smooth, 3x concentrated. 32oz bottle.', price: 15.99, tags: ['coffee', 'cold-brew', 'concentrate', 'artisan'] },
    { name: 'Matcha Green Tea Powder', description: 'Ceremonial grade Japanese matcha powder. Stone-ground, bright green, smooth taste. 100g tin.', price: 29.99, tags: ['tea', 'matcha', 'ceremonial', 'japanese'] },
    { name: 'Organic Trail Mix Bag', description: '2lb bag of organic trail mix with almonds, cashews, dried cranberries, dark chocolate chips, and pumpkin seeds.', price: 19.99, tags: ['snacks', 'trail-mix', 'organic', 'healthy'] },
    { name: 'Truffle Infused Olive Oil', description: 'Premium extra virgin olive oil infused with black truffle. 250ml dark glass bottle. Perfect for finishing dishes.', price: 24.99, tags: ['olive-oil', 'truffle', 'gourmet', 'italian'] },
    { name: 'Kombucha Starter Kit', description: 'Complete home kombucha brewing kit with SCOBY, 1-gallon jar, organic tea, sugar, thermometer, and cheesecloth.', price: 34.99, tags: ['kombucha', 'fermentation', 'diy', 'kit'] },
    { name: 'Smoked Sea Salt Flakes', description: 'Hand-harvested sea salt cold-smoked over applewood. 4oz jar with grinder top. Adds depth to any dish.', price: 12.99, tags: ['spices', 'salt', 'smoked', 'gourmet'] },
    { name: 'Protein Pancake Mix', description: 'High-protein pancake mix with 25g protein per serving. Oat flour, whey, and flax. Just add water. 2lb bag.', price: 17.99, tags: ['protein', 'pancake', 'breakfast', 'fitness'] },
    { name: 'Organic Fair Trade Cocoa', description: 'Premium organic cocoa powder from sustainably farmed cacao. Rich, deep flavor. 16oz resealable bag.', price: 13.99, tags: ['cocoa', 'organic', 'fair-trade', 'baking'] },
    { name: 'Hot Sauce Variety Pack', description: 'Set of 6 small-batch hot sauces ranging from mild to extreme. Includes habanero, ghost pepper, and smoky chipotle.', price: 27.99, tags: ['hot-sauce', 'variety', 'artisan', 'spicy'] },
    { name: 'Chia Seeds Organic Bag', description: 'Organic black chia seeds from Peru. Rich in omega-3, fiber, and protein. 2lb resealable stand-up pouch.', price: 14.99, tags: ['superfood', 'chia', 'organic', 'healthy'] },
    { name: 'Sparkling Water Maker', description: 'Carbonate water at home with this CO2 sparkling water maker. Includes carbonating bottle and 1 CO2 cylinder.', price: 89.99, tags: ['water', 'sparkling', 'carbonated', 'kitchen'] },
    { name: 'Artisan Pasta Variety Box', description: '6 shapes of bronze-die artisan pasta made from organic semolina. 12oz each. Includes spaghetti, fusilli, and more.', price: 28.99, tags: ['pasta', 'artisan', 'italian', 'gourmet'] },
    { name: 'Organic Honey Variety Trio', description: '3 jars of raw organic honey: wildflower, orange blossom, and manuka. 8oz each, beautifully packaged.', price: 24.99, tags: ['honey', 'organic', 'variety', 'raw'] },
    { name: 'Japanese Rice Cooker', description: 'Micom fuzzy logic rice cooker with 5.5 cup capacity, 12 cooking settings, and keep-warm function. Non-stick inner pot.', price: 69.99, tags: ['rice-cooker', 'japanese', 'kitchen', 'micom'] },
    { name: 'Dehydrated Mango Slices', description: 'Freeze-dried mango slices with no added sugar. 3oz bag, pure fruit. Crunchy, sweet, and full of vitamin C.', price: 6.99, tags: ['snacks', 'mango', 'freeze-dried', 'fruit'] },
    { name: 'Organic Elderberry Syrup', description: 'Immune-supporting elderberry syrup with raw honey, ginger, and vitamin C. 8oz glass bottle. Made in USA.', price: 18.99, tags: ['health', 'elderberry', 'syrup', 'immune'] },
    { name: 'Sourdough Starter Kit', description: 'Everything needed to make artisan sourdough bread. Includes active starter, jar, thermometer, scoring tool, and recipe book.', price: 32.99, tags: ['baking', 'sourdough', 'starter', 'kit'] },
    { name: 'Espresso Capsule Variety Pack', description: '60 Nespresso-compatible espresso capsules in 6 roast profiles. Aluminum capsules, recyclable, freshly packed.', price: 35.99, tags: ['coffee', 'espresso', 'capsules', 'variety'] },
    { name: 'Pickled Vegetable Gift Set', description: 'Assortment of 4 artisan pickled vegetables: cucumbers, carrots, onions, and beets. Naturally fermented. 16oz jars.', price: 31.99, tags: ['pickled', 'fermented', 'artisan', 'gift'] },
    { name: 'Aged Balsamic Vinegar', description: '12-year aged balsamic vinegar from Modena, Italy. DOP certified, thick and sweet. 100ml bottle with pour spout.', price: 19.99, tags: ['vinegar', 'balsamic', 'aged', 'italian'] },
  ],

  // ── Toys (20 products) ──
  toys: [
    { name: 'Magnetic Building Tiles Set', description: '100-piece magnetic building tile set with geometric shapes and LED lights. Compatible with other brands. Ages 3+.', price: 54.99, tags: ['building', 'magnetic', 'stem', 'creative'] },
    { name: 'Programmable Robot Kit', description: 'DIY programmable robot with block coding and sensors. IR remote control, obstacle avoidance. Ages 8+. Educational.', price: 44.99, tags: ['robot', 'stem', 'programming', 'educational'] },
    { name: 'Board Game: Catan', description: 'The classic strategy game of trade, build, and settle. 3-4 players, ages 10+. Includes base game and 5-6 player expansion.', price: 44.99, tags: ['board-game', 'strategy', 'family', 'classic'] },
    { name: 'Slime Making Workshop Kit', description: 'Complete slime kit with 20+ ingredients including glue, activator, glitter, beads, and 5 colors. Non-toxic.', price: 24.99, tags: ['slime', 'diy', 'craft', 'kids'] },
    { name: 'Outdoor Camping Play Tent', description: 'Instant pop-up kids play tent with tunnel, ball pit capability, and mesh windows. Fits 3-4 children. Water-resistant.', price: 39.99, tags: ['outdoor', 'tent', 'play', 'kids'] },
    { name: '64-Piece Art Set', description: 'Complete art set with colored pencils, markers, crayons, pastels, watercolors, and sketch pad. Wood case.', price: 29.99, tags: ['art', 'drawing', 'set', 'creative'] },
    { name: 'Stomp Rocket Launcher', description: 'Stomp-powered foam rocket launcher that shoots up to 200 feet. 6 foam rockets with LED lights. Outdoor fun.', price: 19.99, tags: ['outdoor', 'rocket', 'active', 'stomp'] },
    { name: 'Kids Digital Camera', description: 'Kid-friendly 20MP digital camera with 1080p video, 2.4-inch screen, and 16GB card. Shockproof, waterproof.', price: 49.99, tags: ['camera', 'kids', 'digital', 'waterproof'] },
    { name: 'Marble Run Construction Set', description: '150-piece marble run set with tracks, tubes, and LED marbles. Build towering runs with loops and drops. Ages 5+.', price: 34.99, tags: ['marble-run', 'building', 'stem', 'construction'] },
    { name: 'Card Game: Exploding Kittens', description: 'The award-winning card game of strategic explosions. 2-5 players, ages 7+. Easy to learn, hilarious to play.', price: 14.99, tags: ['card-game', 'family', 'strategy', 'party'] },
    { name: 'Finger Painting Set', description: 'Non-toxic washable finger paints in 8 vibrant colors. Includes 10 sheets of art paper and smock. Mess-free fun.', price: 17.99, tags: ['art', 'painting', 'kids', 'washable'] },
    { name: 'Remote Control Excavator', description: '2.4GHz RC excavator with 360-degree rotation, extendable arm, and working bucket. Rechargeable battery.', price: 49.99, tags: ['rc-vehicle', 'excavator', 'remote-control', 'construction'] },
    { name: 'Kids Walkie Talkies Set', description: 'Set of 4 walkie talkies with 2-mile range, flashlight, and belt clip. 22 channels, no license required.', price: 34.99, tags: ['walkie-talkie', 'outdoor', 'communication', 'kids'] },
    { name: 'Jumbo Chess Set', description: '19-inch folding wooden chess board with 3.75-inch weighted pieces. Carried in felt-lined box. Tournament standard.', price: 39.99, tags: ['chess', 'board-game', 'strategy', 'wooden'] },
    { name: 'Water Beads Sensory Kit', description: 'Jumbo water beads sensory play kit with 200,000 beads, tools, and activity guide. Non-toxic, expands in water.', price: 16.99, tags: ['sensory', 'water-beads', 'play', 'educational'] },
    { name: 'Kite with LED Lights', description: 'Large 55-inch delta kite with LED lights, 200ft line, and carrying bag. Flies in light wind, visible at night.', price: 25.99, tags: ['kite', 'outdoor', 'led', 'flying'] },
    { name: 'Wooden Train Set', description: '100-piece wooden train set with tracks, trains, buildings, trees, and figures. Compatible with major brands.', price: 54.99, tags: ['train', 'wooden', 'toy', 'tracks'] },
    { name: 'Glow in the Dark Stars', description: '200 glow-in-the-dark stars and planets with adhesive backing. Create a ceiling galaxy. 2 sizes included.', price: 9.99, tags: ['room-decor', 'glow', 'stars', 'kids'] },
    { name: 'Science Chemistry Lab', description: '50+ chemistry experiments for kids with safety gear, test tubes, chemicals, and lab notebook. Ages 8+. STEM.', price: 38.99, tags: ['science', 'chemistry', 'stem', 'experiments'] },
    { name: 'Plush Unicorn Toy', description: '24-inch plush unicorn with rainbow mane, embroidered details, and ultra-soft fur. Hypoallergenic, machine washable.', price: 27.99, tags: ['stuffed-animal', 'unicorn', 'plush', 'cuddly'] },
  ],

  // ── Music (20 products) ──
  music: [
    { name: 'Ukulele Starter Kit', description: 'Soprano ukulele with nylon strings, digital tuner, picks, and lesson book. Basswood body, 15 frets, in 4 colors.', price: 39.99, tags: ['ukulele', 'starter', 'string', 'bundle'] },
    { name: 'Electronic Drum Pad', description: '7-pad electronic drum kit with built-in sounds, headphone out, and USB-MIDI. Compact and quiet practice.', price: 129.99, tags: ['drums', 'electronic', 'pad', 'practice'] },
    { name: 'Loop Pedal Station', description: 'Multi-effect loop station with 6 hours of recording time, built-in effects, and drum machine. USB powered.', price: 149.99, tags: ['pedal', 'loop-station', 'effects', 'recording'] },
    { name: 'Harmonica Set Professional', description: 'Set of 7 diatonic harmonicas in keys of C, G, D, A, E, F, and Bb. Brass reeds, ABS comb, carrying case.', price: 49.99, tags: ['harmonica', 'set', 'professional', 'blues'] },
    { name: 'Guitar Capo and Pick Set', description: 'Spring-loaded guitar capo with 6 assorted picks, strap, and pouch. Fits acoustic and electric guitars. Quick clamp.', price: 12.99, tags: ['guitar', 'capo', 'picks', 'accessories'] },
    { name: 'Violin for Beginners', description: '4/4 full size violin with bow, rosin, extra strings, case, and tuner. Solid spruce top, ebony fittings.', price: 89.99, tags: ['violin', 'string', 'beginner', 'bundle'] },
    { name: 'Wireless Guitar Transmitter', description: 'Digital wireless guitar system with 2.4GHz, 30ft range, and rechargeable batteries. Zero latency, plug and play.', price: 69.99, tags: ['guitar', 'wireless', 'transmitter', 'accessories'] },
    { name: 'Karaoke Microphone Speaker', description: 'Portable Bluetooth karaoke mic with built-in speaker, voice effects, and LED lights. Works with all music apps.', price: 29.99, tags: ['karaoke', 'microphone', 'bluetooth', 'speaker'] },
    { name: 'Music Stand with LED Light', description: 'Adjustable sheet music stand with clip-on LED light, 3 brightness levels. Foldable, carry bag included.', price: 34.99, tags: ['stand', 'sheet-music', 'led', 'accessories'] },
    { name: 'Acoustic Guitar Picks 12-Pack', description: 'Assorted celluloid guitar picks in varying gauges: thin, medium, and heavy. 12 picks per pack, 2 of each color.', price: 5.99, tags: ['guitar', 'picks', 'assorted', 'accessories'] },
    { name: 'Keyboard Piano 61 Keys', description: '61-key portable keyboard with touch sensitivity, 400 tones, 200 rhythms, and LCD display. Includes stand.', price: 159.99, tags: ['keyboard', 'piano', 'portable', 'beginner'] },
    { name: 'Acoustic Guitar Strings Light', description: 'Light gauge acoustic guitar strings (12-53) with phosphor bronze winding. Bright, balanced tone. 5 sets pack.', price: 19.99, tags: ['guitar', 'strings', 'acoustic', 'light'] },
    { name: 'DJ Mixer Controller', description: '2-channel DJ controller with built-in audio interface, touch-capacitive jog wheels, and 8 pads per deck.', price: 249.99, tags: ['dj', 'controller', 'mixer', 'digital'] },
    { name: 'Metronome with Visual Beat', description: 'Digital metronome with LED visual beat indicator, adjustable tempo 30-250 bpm, and volume control. Battery included.', price: 15.99, tags: ['metronome', 'practice', 'rhythm', 'digital'] },
    { name: 'Recorder Woodwind Instrument', description: 'Soprano recorder in C, Baroque fingering. Maple wood with double holes. Includes fingering chart and cleaning rod.', price: 18.99, tags: ['recorder', 'woodwind', 'beginner', 'educational'] },
    { name: 'Guitar Hanger Wall Mount', description: 'Locking guitar wall mount with foam padding and adjustable cradle. Heavy duty steel, holds up to 25 lbs.', price: 14.99, tags: ['guitar', 'wall-mount', 'hanger', 'storage'] },
    { name: 'Handpan Steel Drum', description: '9-note handpan/drum in D minor. Nitrided steel, includes carrying bag and tuning certificate. Percussion meditation.', price: 499.99, tags: ['handpan', 'percussion', 'meditation', 'steel-drum'] },
    { name: 'Earphone Monitor System', description: 'In-ear monitor system with dual drivers, detachable cable, and memory foam tips. Audiophile quality for stage use.', price: 79.99, tags: ['earphones', 'monitor', 'in-ear', 'stage'] },
    { name: 'Analog Synthesizer Module', description: 'Desktop analog synthesizer with 2 VCOs, ladder filter, envelope generator, and 32-step sequencer. Made in USA.', price: 599.99, tags: ['synthesizer', 'analog', 'modular', 'electronic-music'] },
    { name: 'Tuning Fork Set', description: 'Set of 5 precision tuning forks: 528Hz, 432Hz, 396Hz, 639Hz, and 852Hz. Made of aluminum alloy with handles.', price: 22.99, tags: ['tuning', 'forks', 'sound-healing', 'meditation'] },
  ],

  // ── Automotive (20 products) ──
  automotive: [
    { name: 'Car Trunk Organizer', description: 'Collapsible trunk organizer with 2 removable dividers, waterproof lining, and handles. Folds flat when empty.', price: 29.99, tags: ['organizer', 'trunk', 'storage', 'cargo'] },
    { name: 'Windshield Sun Shade', description: 'Foldable reflective sun shade blocks UV and heat. Custom fit for most cars. Reduces cabin temperature by 30°F.', price: 16.99, tags: ['sun-shade', 'windshield', 'uv-protection', 'cooling'] },
    { name: 'All-Weather Floor Mats', description: 'Heavy-duty rubber floor mats with raised edges, anti-slip backing, and custom fit for most vehicles. Set of 4.', price: 44.99, tags: ['floor-mats', 'all-weather', 'rubber', 'protection'] },
    { name: 'Car Seat Gap Filler', description: 'Leather-like seat gap filler prevents items from falling between seats and console. Set of 2, universal fit.', price: 12.99, tags: ['organizer', 'seat-gap', 'interior', 'accessory'] },
    { name: 'LED Interior Strip Lights', description: 'App-controlled LED strip lights with 16M colors, music sync, and 4 strips. USB powered, easy DIY install.', price: 19.99, tags: ['lighting', 'led', 'interior', 'ambient'] },
    { name: 'Wireless CarPlay Adapter', description: 'Plug-and-play wireless adapter for wired CarPlay. 5GHz WiFi, auto-connect, supports all CarPlay vehicles.', price: 69.99, tags: ['carplay', 'wireless', 'adapter', 'tech'] },
    { name: 'Steering Wheel Cover', description: 'Premium leather steering wheel cover with perforated grip and ergonomic design. Universal fit 14-15 inch wheels.', price: 22.99, tags: ['interior', 'steering-wheel', 'cover', 'leather'] },
    { name: 'Car Trash Can with Lid', description: 'Leak-proof car trash can with locking lid, 2-gallon capacity, and adjustable strap. Easy to clean and empty.', price: 14.99, tags: ['trash', 'interior', 'organization', 'accessory'] },
    { name: 'Blind Spot Mirror Set', description: 'Set of 2 adjustable blind spot mirrors with 360-degree rotation. Wide angle, HD glass, weatherproof.', price: 8.99, tags: ['mirror', 'safety', 'blind-spot', 'accessory'] },
    { name: 'Backup Camera Wireless', description: 'HD 1080p wireless backup camera with night vision and 5-inch monitor. Easy installation, license plate mount.', price: 89.99, tags: ['camera', 'backup', 'wireless', 'safety'] },
    { name: 'Car Seat Cushion', description: 'Memory foam seat cushion with gel-infused cooling layer and coccyx cutout. Ergonomic relief for long drives.', price: 34.99, tags: ['cushion', 'seat', 'ergonomic', 'memory-foam'] },
    { name: 'Roadside Emergency Kit', description: '140-piece emergency kit with jumper cables, first aid, tire repair, flashlight, and survival tools. Packed in case.', price: 39.99, tags: ['emergency', 'safety', 'kit', 'roadside'] },
    { name: 'Car Phone Holder Vent Mount', description: 'Universal phone mount with one-touch clamp, telescopic arm, and vent clip. 360-degree rotation, stable grip.', price: 14.99, tags: ['phone-mount', 'vent', 'universal', 'accessory'] },
    { name: 'Dash Camera 1080p', description: 'Compact 1080p dash cam with wide angle, night vision, parking mode, and loop recording. 3-inch screen.', price: 59.99, tags: ['camera', 'dash-cam', '1080p', 'safety'] },
    { name: 'Microfiber Car Drying Towel', description: 'Jumbo 36x24 inch microfiber drying towel with 1200 GSM. Ultra-absorbent, lint-free, and machine washable. Set of 2.', price: 16.99, tags: ['cleaning', 'microfiber', 'towel', 'drying'] },
    { name: 'Portable Tire Inflator', description: 'Digital tire inflator with 120 PSI, auto-shutoff, LED light, and 12V DC. Compact, stores in glove box.', price: 28.99, tags: ['tire', 'inflator', 'portable', 'emergency'] },
    { name: 'Scented Vent Clips Set', description: 'Set of 6 car vent diffuser clips with essential oil scent pods. Long-lasting fragrance, adjustable intensity.', price: 13.99, tags: ['air-freshener', 'vent-clip', 'scented', 'accessory'] },
    { name: 'Car Window Shade Set', description: 'Custom-fit magnetic window shades for 4 doors. Blocks 95% UV, reduces glare, and provides privacy. Easy install.', price: 27.99, tags: ['sun-shade', 'window', 'uv-protection', 'privacy'] },
    { name: 'OBD2 Car Scanner', description: 'Bluetooth OBD2 diagnostic scanner with app support. Reads and clears engine codes, monitors real-time data.', price: 22.99, tags: ['diagnostic', 'obd2', 'bluetooth', 'scanner'] },
    { name: 'Leather Key Fob Cover', description: 'Genuine leather key fob cover with key ring and stitching detail. Protects against drops and scratches. Fits most fobs.', price: 11.99, tags: ['key-fob', 'cover', 'leather', 'protection'] },
  ],
};

// ──────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log(`Connected to database: ${db.databaseName}\n`);

  // ── Fetch existing data ──
  const existingProducts = await db.collection('products').find({}).toArray();
  const existingProductCount = existingProducts.length;
  console.log(`Found ${existingProductCount} existing products\n`);

  // Build category slug → _id map from the categories collection
  const categories = await db.collection('categories').find({}).toArray();
  const catSlugToId = new Map<string, string>();
  for (const cat of categories) {
    catSlugToId.set(cat.slug, cat._id.toString());
  }
  console.log(`Found ${categories.length} categories`);
  for (const [slug, id] of catSlugToId) {
    console.log(`  ${slug} → ${id}`);
  }

  // Verify all category slugs are mapped
  for (const slug of CATEGORY_SLUGS) {
    if (!catSlugToId.has(slug)) {
      console.warn(`  ⚠️  Category "${slug}" not found in DB. Skipping products for this category.`);
    }
  }

  // Get existing slug set to avoid duplicates
  const existingSlugs = new Set(existingProducts.map((p: any) => p.slug));
  const existingNames = new Set(existingProducts.map((p: any) => p.name));

  // ── Prepare 200 new products ──
  console.log('\n--- Generating 200 new products ---');
  const newProducts: any[] = [];
  let globalProductIndex = 200; // Start well above existing indexes

  for (const categorySlug of CATEGORY_SLUGS) {
    const catId = catSlugToId.get(categorySlug);
    if (!catId) continue;

    // Map category slug to product definitions key
    // (home-garden slug uses 'home' as key in PRODUCTS_BY_CATEGORY)
    const productDefsKey = categorySlug === 'home-garden' ? 'home' : categorySlug;
    const productDefs = PRODUCTS_BY_CATEGORY[productDefsKey];
    if (!productDefs) continue;

    const effectiveSlug = categorySlug;

    const variantSizes = ['XS', 'S', 'M', 'L', 'XL'];
    const variantColors = ['Black', 'White', 'Blue', 'Red', 'Green'];

    for (const prodDef of productDefs) {
      // Ensure unique name (add suffix if duplicate)
      let name = prodDef.name;
      if (existingNames.has(name)) {
        name = `${name} (Premium)`;
        // If still duplicate, add random suffix
        if (existingNames.has(name)) {
          name = `${name} ${randInt(1, 999)}`;
        }
      }
      existingNames.add(name);

      // Generate unique slug
      let slug = `${effectiveSlug}-${slugify(prodDef.name)}-${globalProductIndex}`;
      if (existingSlugs.has(slug)) {
        slug = `${effectiveSlug}-${slugify(prodDef.name)}-${globalProductIndex}-${randInt(10, 99)}`;
      }
      existingSlugs.add(slug);

      const inventory = randInt(10, 500);
      const rating = +(Math.random() * 3 + 2).toFixed(1); // 2.0 - 5.0
      const reviewCount = randInt(0, 80);
      const now = new Date();
      const createdAt = randomDate(180);
      const updatedAt = randomDate(30);

      // Generate variants (50% of products have them)
      const variants: any[] = [];
      if (prodDef.hasVariants !== false && Math.random() > 0.5) {
        const variantCount = randInt(2, 4);
        const useSizes = ['clothing', 'shoes'].includes(categorySlug);
        for (let vi = 0; vi < variantCount; vi++) {
          const vName = useSizes
            ? pick(variantSizes)
            : pick(variantColors);
          variants.push({
            name: vName,
            sku: `SKU-${String(globalProductIndex).padStart(5, '0')}-${String(vi + 1).padStart(2, '0')}`,
            price: vi === 0
              ? undefined
              : +(prodDef.price * (0.85 + Math.random() * 0.3)).toFixed(2),
            inventory: Math.floor(inventory / (vi + 1)),
          });
        }
      }

      // Images
      const imageUrls = [
        `https://picsum.photos/seed/seed200-${globalProductIndex}/600/600`,
        `https://picsum.photos/seed/seed200-${globalProductIndex}a/600/600`,
        `https://picsum.photos/seed/seed200-${globalProductIndex}b/600/600`,
      ];

      newProducts.push({
        name,
        slug,
        description: prodDef.description,
        price: prodDef.price,
        categoryId: catId,
        images: imageUrls,
        variants,
        inventory,
        tags: prodDef.tags,
        isActive: true,
        isFeatured: Math.random() > 0.85,
        rating,
        reviewCount,
        createdAt,
        updatedAt,
      });

      globalProductIndex++;
    }
  }

  console.log(`Generated ${newProducts.length} new product documents`);

  // ── Insert new products ──
  console.log('\n1. Inserting new products...');
  const insertResult = await db.collection('products').insertMany(newProducts);
  const newProductIds = Object.values(insertResult.insertedIds).map((id) => id.toString());
  console.log(`   Inserted ${newProductIds.length} new products (IDs: ${newProductIds[0]}...${newProductIds[newProductIds.length - 1]})`);

  // ── Upsert product_analytics for ALL products (existing + new) ──
  console.log('\n2. Upserting product analytics for ALL products...');
  const allProducts = await db.collection('products').find({}).toArray();
  const analyticsCol = db.collection('product_analytics');
  let analyticsCount = 0;

  // Clear existing analytics and regenerate for all
  const deletedAnalytics = await analyticsCol.deleteMany({});
  console.log(`   Cleared ${deletedAnalytics.deletedCount} existing analytics`);

  const analyticsDocs = [];
  for (const product of allProducts) {
    const pid = product._id.toString();
    const totalViews = randInt(100, 10000);
    const purchases = randInt(0, 200);
    const rating = product.rating ?? 3.5;

    const trendingScore = totalViews * 2 + purchases * 10;
    const popularityScore = totalViews * 0.5 + purchases * 20 + rating * 100;

    // Use Int32 for integer fields to match MongoDB validator's bsonType: 'int' requirement
    analyticsDocs.push({
      _id: pid,
      productId: pid,
      totalViews: new Int32(totalViews),
      uniqueViews: new Int32(Math.floor(totalViews * (0.4 + Math.random() * 0.2))),
      productClicks: new Int32(randInt(5, 2000)),
      addToCartCount: new Int32(randInt(1, 500)),
      removeFromCartCount: new Int32(randInt(0, 80)),
      wishlistCount: new Int32(randInt(0, 150)),
      purchases: new Int32(purchases),
      orderCount: new Int32(randInt(0, 150)),
      searchCount: new Int32(randInt(0, 200)),
      shareCount: new Int32(randInt(0, 50)),
      avgTimeSpent: +(Math.random() * 120).toFixed(2),
      bounceRate: +(Math.random() * 0.6).toFixed(4),
      conversionRate: +(Math.random() * 0.15).toFixed(4),
      productRating: rating,
      ratingCount: new Int32(randInt(0, 300)),
      reviewCount: new Int32(product.reviewCount || 0),
      trendingScore,
      popularityScore,
      lastViewedAt: randomDate(7),
      lastPurchasedAt: Math.random() > 0.4 ? randomDate(30) : undefined,
      createdAt: product.createdAt || randomDate(180),
      updatedAt: new Date(),
    });
  }

  const analyticsResult = await analyticsCol.insertMany(analyticsDocs);
  analyticsCount = analyticsResult.insertedCount;
  console.log(`   Inserted ${analyticsCount} product analytics records`);

  // ── Seed reviews for new products (50-100 total) ──
  console.log('\n3. Seeding reviews for new products...');
  const reviewsCol = db.collection('reviews');

  const reviewCount = await reviewsCol.countDocuments();
  console.log(`   Existing reviews: ${reviewCount}`);

  // Select ~half of the new products to receive reviews
  const shuffledNewProducts = [...newProducts].sort(() => Math.random() - 0.5);
  const reviewProductCount = Math.min(randInt(15, 25), shuffledNewProducts.length);
  const reviewProducts = shuffledNewProducts.slice(0, reviewProductCount);
  let insertedReviews = 0;

  // Fetch the newly inserted products from DB to get their actual _ids
  const newlyInserted = await db.collection('products')
    .find({ slug: { $in: reviewProducts.map((p) => p.slug) } })
    .toArray();

  const slugToId = new Map(newlyInserted.map((p: any) => [p.slug, p._id.toString()]));

  for (const product of reviewProducts) {
    const pid = slugToId.get(product.slug);
    if (!pid) continue;

    const productRating = product.rating || 3.5;
    let numReviews: number;
    if (productRating >= 4) {
      numReviews = randInt(3, 8);
    } else if (productRating >= 3) {
      numReviews = randInt(2, 5);
    } else {
      numReviews = randInt(1, 3);
    }

    const reviewers = [...USERS].sort(() => Math.random() - 0.5).slice(0, Math.min(numReviews, USERS.length));

    for (const reviewer of reviewers) {
      const reviewRating = weightedRating();
      const review = {
        _id: new ObjectId().toString(),
        userId: reviewer.email,
        productId: pid,
        rating: reviewRating,
        title: pick(REVIEW_TITLES),
        review: pick(REVIEW_BODIES),
        images: [],
        verifiedPurchase: Math.random() > 0.4,
        helpfulCount: randInt(0, 30),
        reportCount: Math.random() > 0.9 ? randInt(1, 3) : 0,
        createdAt: randomDate(60),
        updatedAt: randomDate(30),
      };

      try {
        await reviewsCol.insertOne(review);
        insertedReviews++;
      } catch (err: any) {
        // Skip duplicate reviews (unique userId + productId index)
        if (err.code !== 11000) {
          console.warn(`   ⚠️  Failed to insert review: ${err.message}`);
        }
      }
    }
  }
  console.log(`   Inserted ${insertedReviews} new reviews`);

  // ── Update user_activity for existing users ──
  console.log('\n4. Updating user activity...');
  const activityCol = db.collection('user_activity');

  // Fetch newly inserted products from DB (all 200, not just review subset)
  const allNewProductIds = newProducts.map((p: any) => p.slug);
  const dbNewProducts = await db.collection('products')
    .find({ slug: { $in: allNewProductIds } })
    .toArray();

  // Use email-based user IDs matching the USERS array
  for (const user of USERS) {
    const userId = user.email;

    // Get 5-15 new products for recentlyViewed
    const numViewed = randInt(5, 15);
    const viewedSet = new Set<string>();
    const recentlyViewed: any[] = [];

    for (let i = 0; i < numViewed; i++) {
      const product = pick(dbNewProducts);
      const pid = product._id.toString();
      // Deduplicate by productId
      if (viewedSet.has(pid)) continue;
      viewedSet.add(pid);

      recentlyViewed.push({
        productId: pid,
        productName: product.name,
        price: product.price,
        image: (product.images || [])[0] || '',
        viewedAt: randomDate(14),
      });
    }

    // Update category interests based on new product categories
    const categoryInterests: Record<string, number> = {};
    for (const slug of CATEGORY_SLUGS) {
      const catId = catSlugToId.get(slug);
      if (catId) {
        categoryInterests[catId] = Math.floor(Math.random() * 10);
      }
    }

    try {
      const existing = await activityCol.findOne({ _id: userId });
      if (existing) {
        // Append new recentlyViewed (keep recent, cap at 50)
        const combined = [...recentlyViewed, ...(existing.recentlyViewed || [])];
        const deduplicated: any[] = [];
        const seenIds = new Set<string>();
        for (const entry of combined) {
          if (!seenIds.has(entry.productId)) {
            seenIds.add(entry.productId);
            deduplicated.push(entry);
          }
        }
        const trimmed = deduplicated.slice(0, 50);

        // Merge category interests
        const mergedCategoryInterests = { ...(existing.categoryInterests || {}) };
        for (const [catId, score] of Object.entries(categoryInterests)) {
          mergedCategoryInterests[catId] = (mergedCategoryInterests[catId] || 0) + (score as number);
        }

        await activityCol.updateOne(
          { _id: userId },
          {
            $set: {
              recentlyViewed: trimmed,
              categoryInterests: mergedCategoryInterests,
              updatedAt: new Date(),
            },
          },
        );
      } else {
        // Create new activity document
        await activityCol.insertOne({
          _id: userId,
          recentlyViewed,
          searchHistory: USERS.sort(() => Math.random() - 0.5).slice(0, randInt(2, 6)).map(() => ({
            query: pick(SEARCH_QUERIES),
            timestamp: randomDate(14),
          })),
          clickHistory: recentlyViewed.slice(0, randInt(3, 8)).map((rv: any) => ({
            productId: rv.productId,
            timestamp: randomDate(7),
          })),
          browsingHistory: [],
          wishlist: recentlyViewed.slice(0, randInt(0, 3)).map((rv: any) => rv.productId),
          cart: [],
          orders: [],
          purchases: recentlyViewed.slice(0, randInt(0, 2)).map((rv: any) => rv.productId),
          categoryInterests,
          brandInterests: {},
          pricePreferences: {
            min: Math.floor(Math.random() * 50),
            max: Math.floor(50 + Math.random() * 200),
          },
          device: pick(['desktop', 'mobile', 'tablet']),
          sessionDuration: randInt(60, 3600),
          lastActive: randomDate(1),
          preferredCategories: CATEGORY_SLUGS.sort(() => Math.random() - 0.5).slice(0, 3),
          preferredBrands: [],
          createdAt: randomDate(90),
          updatedAt: randomDate(1),
        });
      }
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to update activity for ${userId}: ${err.message}`);
    }
  }
  console.log(`   Updated/seeded activity for ${USERS.length} users`);

  // ── Summary ──
  const finalProductCount = await db.collection('products').countDocuments();
  const finalAnalyticsCount = await analyticsCol.countDocuments();
  const finalReviewCount = await reviewsCol.countDocuments();
  const finalActivityCount = await activityCol.countDocuments();

  console.log('\n' + '='.repeat(60));
  console.log('✅ SEED 200 PRODUCTS COMPLETE');
  console.log('='.repeat(60));
  console.log(`   Products:           ${finalProductCount} (${finalProductCount - existingProductCount} new)`);
  console.log(`   Product analytics:  ${finalAnalyticsCount}`);
  console.log(`   Reviews:            ${finalReviewCount}`);
  console.log(`   User activity:      ${finalActivityCount}`);
  console.log(`   Users with data:    ${USERS.length}`);

  await client.close();
  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
