/**
 * MongoDB Seed Script for mongosh
 *
 * Usage: mongosh mongodb://localhost:27017/ecommerce seed-mongosh.js
 * Run from inside the mongodb container.
 */

// ──────────────────────────────────────────
// Category Definitions
// ──────────────────────────────────────────

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', description: 'Cutting-edge gadgets and devices — from wireless audio and smart home tech to computing peripherals and camera gear. Power your digital life.', sortOrder: 1 },
  { name: 'Clothing', slug: 'clothing', description: 'Premium apparel for every occasion. Discover timeless staples and modern essentials crafted from quality materials.', sortOrder: 2 },
  { name: 'Home & Garden', slug: 'home-garden', description: 'Transform your living space with curated home decor, kitchen essentials, and garden must-haves. Create a sanctuary you love.', sortOrder: 3 },
  { name: 'Books', slug: 'books', description: 'Expand your mind with our curated selection of technology, science, and personal development books — from beginner-friendly guides to advanced references.', sortOrder: 4 },
  { name: 'Sports', slug: 'sports', description: 'Gear up for an active lifestyle. From yoga and running to strength training, find everything you need to stay fit and motivated.', sortOrder: 5 },
  { name: 'Beauty', slug: 'beauty', description: 'Elevate your self-care routine with premium skincare, haircare, and makeup essentials. Feel confident in your own skin.', sortOrder: 6 },
  { name: 'Food & Drinks', slug: 'food-drinks', description: 'Gourmet treats and artisanal beverages for the discerning palate. From single-origin coffee to craft chocolate, indulge your senses.', sortOrder: 7 },
  { name: 'Toys', slug: 'toys', description: 'Ignite imagination with engaging toys, puzzles, and games for all ages. Learning through play has never been this fun.', sortOrder: 8 },
  { name: 'Music', slug: 'music', description: 'Everything for musicians and audiophiles — instruments, accessories, and audio gear to make, record, and enjoy every note.', sortOrder: 9 },
  { name: 'Automotive', slug: 'automotive', description: 'Keep your vehicle in top shape with essential accessories, tools, and tech — from dash cams to interior care.', sortOrder: 10 },
];

// ──────────────────────────────────────────
// Product Definitions (100 across categories)
// ──────────────────────────────────────────

const PRODUCTS_BY_CATEGORY = {
  'electronics': [
    { name: 'Wireless Noise-Cancelling Headphones', description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and rich bass response.', price: 299.99, compareAtPrice: 349.99, tags: ['audio', 'wireless', 'headphones', 'noise-cancelling'], isFeatured: true },
    { name: 'Bluetooth 5.3 Speaker', description: 'Portable waterproof speaker with 360-degree sound, 20-hour playback, and built-in microphone.', price: 79.99, tags: ['audio', 'speaker', 'bluetooth', 'portable'] },
    { name: 'USB-C 7-in-1 Hub', description: 'Compact USB-C hub with HDMI 4K, USB 3.0 x3, SD/TF card reader, and PD 100W charging.', price: 49.99, tags: ['accessories', 'usb-c', 'hub', 'adapter'] },
    { name: 'Adjustable Laptop Stand', description: 'Ergonomic aluminum laptop stand with 6 adjustable angles. Improves posture and airflow.', price: 39.99, tags: ['accessories', 'laptop', 'ergonomic', 'stand'], isFeatured: true },
    { name: 'Mechanical Gaming Keyboard', description: 'Full-size mechanical keyboard with hot-swappable switches, per-key RGB, and aircraft-grade aluminum frame.', price: 149.99, compareAtPrice: 179.99, tags: ['gaming', 'keyboard', 'mechanical', 'rgb'] },
    { name: 'Ergonomic Vertical Mouse', description: 'Wireless vertical mouse designed to reduce wrist strain. 6 programmable buttons, silent clicks.', price: 44.99, tags: ['accessories', 'mouse', 'ergonomic', 'wireless'] },
    { name: '27" 4K IPS Monitor', description: '27-inch 4K UHD display with IPS panel, 99% sRGB, USB-C power delivery.', price: 499.99, compareAtPrice: 599.99, tags: ['monitor', '4k', 'ips', 'display'], isFeatured: true },
    { name: '4K Webcam with Ring Light', description: 'Ultra HD 4K webcam with auto-focus, built-in ring light, and noise-reducing dual microphones.', price: 89.99, tags: ['camera', 'webcam', 'streaming', '4k'] },
    { name: '20000mAh Power Bank', description: 'High-capacity portable charger with 65W PD fast charging, dual USB-C, and LED display.', price: 59.99, tags: ['accessories', 'power', 'charger', 'portable'] },
    { name: 'WiFi Smart Plug 4-Pack', description: 'Smart plugs with energy monitoring, remote control via app, and voice assistant support.', price: 34.99, tags: ['smart-home', 'wifi', 'plug', 'automation'] },
    { name: 'True Wireless Earbuds', description: 'Compact earbuds with active noise cancellation, IPX5 water resistance, and 8-hour battery life.', price: 129.99, compareAtPrice: 159.99, tags: ['audio', 'earbuds', 'wireless', 'noise-cancelling'], isFeatured: true },
    { name: 'Tablet Stand with Gooseneck', description: 'Flexible gooseneck tablet stand with sturdy clamp mount. 360-degree rotation.', price: 24.99, tags: ['accessories', 'tablet', 'stand', 'mount'] },
    { name: 'LED Desk Lamp with Wireless Charger', description: 'Adjustable LED desk lamp with 5 color modes, 7 brightness levels, and built-in 15W Qi wireless charging.', price: 69.99, tags: ['lighting', 'led', 'desk-lamp', 'wireless-charging'] },
    { name: 'Smart Thermostat', description: 'WiFi-enabled programmable thermostat with energy-saving algorithms and geofencing.', price: 199.99, tags: ['smart-home', 'thermostat', 'energy', 'wifi'] },
    { name: 'HD Action Camera', description: '4K60fps action camera with electronic stabilization, waterproof to 10m, and dual screens.', price: 249.99, compareAtPrice: 299.99, tags: ['camera', 'action', '4k', 'outdoor'] },
    { name: 'Foldable Drone with 4K Camera', description: 'Compact foldable drone with 4K stabilized camera, 31-min flight time, GPS auto-return.', price: 799.99, tags: ['drone', 'camera', '4k', 'gps'], isFeatured: true },
    { name: 'Fitness Tracker', description: 'Slim fitness band with heart rate, SpO2, sleep tracking, GPS, and 14-day battery.', price: 99.99, tags: ['wearable', 'fitness', 'tracker', 'health'] },
    { name: 'GPS Sports Watch', description: 'Premium GPS watch with AMOLED display, multi-band GPS, training metrics, and 2-week battery.', price: 349.99, tags: ['wearable', 'watch', 'gps', 'sports'], isFeatured: true },
    { name: '10" E-Reader', description: 'High-resolution e-ink display with adjustable warm light, waterproof design, and weeks-long battery.', price: 139.99, tags: ['reading', 'e-reader', 'e-ink', 'portable'] },
    { name: 'Dual Wireless Charging Pad', description: 'Fast wireless charger for phone and earbuds simultaneously. 15W max output.', price: 29.99, tags: ['accessories', 'charging', 'wireless', 'pad'] },
  ],
  'clothing': [
    { name: 'Premium Cotton T-Shirt', description: 'Heavyweight combed ring-spun cotton tee. Pre-shrunk, reinforced seams, and a comfortable regular fit.', price: 29.99, tags: ['basics', 'cotton', 't-shirt', 'casual'] },
    { name: 'Classic Denim Jacket', description: 'Timeless denim jacket crafted from rigid selvage denim. Features button closure, chest pockets.', price: 89.99, compareAtPrice: 119.99, tags: ['outerwear', 'denim', 'jacket', 'classic'], isFeatured: true },
    { name: 'Lightweight Running Shoes', description: 'Breathable mesh running shoes with responsive foam cushioning and rubber outsole.', price: 129.99, tags: ['footwear', 'running', 'mesh', 'cushioned'] },
    { name: 'Merino Wool Sweater', description: 'Extra-fine merino wool crewneck sweater. Temperature regulating, odor resistant.', price: 79.99, tags: ['knitwear', 'wool', 'sweater', 'merino'] },
    { name: 'Unstructured Cotton Blazer', description: 'Relaxed-fit unlined blazer in breathable cotton twill. Patch pockets, natural shoulders.', price: 149.99, tags: ['formal', 'blazer', 'cotton', 'smart-casual'] },
    { name: 'Slim Fit Chino Pants', description: 'Stretch cotton chinos with a modern slim fit. Mid-rise, tapered leg.', price: 69.99, tags: ['bottoms', 'chinos', 'slim-fit', 'stretch'] },
    { name: 'Full-Grain Leather Belt', description: 'Handcrafted full-grain leather belt with brushed nickel buckle. 1.25" width.', price: 49.99, tags: ['accessories', 'belt', 'leather', 'handcrafted'] },
    { name: 'Silk Touch Scarf', description: 'Luxuriously soft silk-modal blend scarf. Lightweight, wrinkle resistant.', price: 39.99, tags: ['accessories', 'scarf', 'silk', 'luxury'] },
    { name: 'Insulated Winter Parka', description: 'Water-resistant winter parka with down-alternative insulation, adjustable hood.', price: 249.99, tags: ['outerwear', 'parka', 'winter', 'insulated'], isFeatured: true },
    { name: 'High-Waist Yoga Leggings', description: 'Buttery-soft four-way stretch leggings with high-rise waistband. Moisture-wicking.', price: 54.99, tags: ['activewear', 'leggings', 'yoga', 'stretch'] },
    { name: 'Classic Pique Polo Shirt', description: 'Pure cotton pique polo with ribbed collar, three-button placket, and side vents.', price: 59.99, tags: ['basics', 'polo', 'cotton', 'pique'] },
    { name: 'Minimalist Canvas Sneakers', description: 'Low-top canvas sneakers with vulcanized rubber sole, padded collar, and metal eyelets.', price: 64.99, tags: ['footwear', 'sneakers', 'canvas', 'minimal'] },
    { name: 'Non-Iron Dress Shirt', description: 'Wrinkle-free pinpoint oxford dress shirt with button-down collar and chest pocket.', price: 74.99, tags: ['formal', 'shirt', 'dress', 'oxford'] },
    { name: 'Cargo Shorts with 6 Pockets', description: 'Durable cotton cargo shorts with multiple utility pockets, reinforced seams.', price: 44.99, tags: ['bottoms', 'shorts', 'cargo', 'outdoor'] },
    { name: 'Chunky Knit Beanie', description: 'Thick acrylic knit beanie with ribbed cuff and faux fur pom-pom.', price: 24.99, tags: ['accessories', 'beanie', 'knit', 'winter'] },
  ],
  'home-garden': [
    { name: 'Luxury Throw Pillow Set', description: 'Set of 2 decorative throw pillows with removable linen-cotton covers.', price: 39.99, tags: ['decor', 'pillows', 'linen', 'set'] },
    { name: 'Hand-Poured Scented Candle', description: 'Soy wax candle hand-poured in a ceramic vessel. 60-hour burn time.', price: 28.99, tags: ['decor', 'candle', 'soy', 'aromatherapy'] },
    { name: 'Set of 4 Plant Pots', description: 'Modern matte ceramic plant pots with drainage holes and bamboo trays.', price: 49.99, tags: ['garden', 'pots', 'ceramic', 'indoor'] },
    { name: 'German Kitchen Knife Set', description: 'Forged high-carbon stainless steel knife set (chef, bread, utility, paring).', price: 129.99, compareAtPrice: 179.99, tags: ['kitchen', 'knives', 'stainless-steel', 'set'], isFeatured: true },
    { name: 'Organic Bamboo Cutting Board', description: 'Large organic bamboo cutting board with juice groove and built-in handles.', price: 34.99, tags: ['kitchen', 'bamboo', 'cutting-board', 'eco-friendly'] },
    { name: '12-Cup Programmable Coffee Maker', description: 'Programmable drip coffee maker with thermal carafe, brew strength selector.', price: 89.99, tags: ['kitchen', 'coffee', 'brewer', 'programmable'] },
    { name: '1800 Thread Count Sheet Set', description: 'Egyptian cotton sheet set with 1800 thread count. Includes fitted sheet, flat sheet, and 2 pillowcases.', price: 119.99, compareAtPrice: 159.99, tags: ['bedding', 'sheets', 'cotton', 'luxury'], isFeatured: true },
    { name: 'Premium Bath Towel Collection', description: 'Set of 4 Turkish cotton bath towels with 700 GSM weight. Quick-drying.', price: 74.99, tags: ['bath', 'towels', 'cotton', 'turkish'] },
    { name: 'Silent Wall Clock', description: 'Large 12" quartz wall clock with ultra-quiet sweep movement.', price: 29.99, tags: ['decor', 'clock', 'minimal', 'silent'] },
    { name: 'Low-Light Indoor Plant Bundle', description: '3 easy-care indoor plants (snake plant, pothos, ZZ) in 6" nursery pots.', price: 44.99, tags: ['garden', 'plants', 'indoor', 'bundle'] },
    { name: '8-Piece Garden Tool Set', description: 'Stainless steel garden tool set with bypass pruners, trowel, cultivator, gloves.', price: 54.99, tags: ['garden', 'tools', 'set', 'stainless'] },
    { name: '48FT Outdoor String Lights', description: 'Weatherproof LED string lights with 24 shatterproof Edison bulbs.', price: 36.99, tags: ['lighting', 'outdoor', 'string-lights', 'led'] },
  ],
  'books': [
    { name: 'The Art of Programming, 4th Ed.', description: 'Comprehensive guide to algorithms and data structures. Covers sorting, graphs, strings.', price: 49.99, tags: ['programming', 'algorithms', 'computer-science', 'textbook'], isFeatured: true },
    { name: 'Data Structures Unlocked', description: 'A visual and intuitive approach to data structures with real-world examples.', price: 39.99, tags: ['programming', 'data-structures', 'education', 'interactive'] },
    { name: 'Machine Learning: A Practical Introduction', description: 'Hands-on guide to ML with Python, scikit-learn, and TensorFlow.', price: 54.99, tags: ['machine-learning', 'python', 'ai', 'practical'] },
    { name: 'Design Patterns in Modern TypeScript', description: 'Gang of Four patterns re-imagined for TypeScript and Node.js.', price: 44.99, tags: ['typescript', 'design-patterns', 'nodejs', 'software-engineering'] },
    { name: 'Clean Code: A Craftsman\'s Guide', description: 'Essential reading for every developer. Learn to write readable, maintainable code.', price: 42.99, tags: ['programming', 'clean-code', 'best-practices', 'craftsmanship'], isFeatured: true },
    { name: 'System Design Interview, 2nd Ed.', description: 'An insider\'s guide to acing system design interviews. Covers distributed systems.', price: 35.99, tags: ['system-design', 'interview', 'distributed-systems', 'architecture'] },
    { name: 'Algorithm Puzzles for Interviews', description: '100 hand-picked algorithm puzzles with detailed solutions.', price: 29.99, tags: ['algorithms', 'puzzles', 'interview', 'problem-solving'] },
    { name: 'Full-Stack Web Development', description: 'End-to-end guide to building modern web apps with React, Node.js, GraphQL, and MongoDB.', price: 47.99, tags: ['web-development', 'full-stack', 'react', 'nodejs'] },
    { name: 'Database Internals: A Deep Dive', description: 'Understand how databases work under the hood — storage engines, replication, distributed consensus.', price: 59.99, tags: ['database', 'internals', 'distributed-systems', 'engineering'] },
    { name: 'Cloud Architecture Patterns', description: 'Proven architectural patterns for building resilient, scalable cloud-native applications.', price: 52.99, tags: ['cloud', 'architecture', 'aws', 'patterns'], isFeatured: true },
  ],
  'sports': [
    { name: 'Extra Thick Yoga Mat', description: '6mm thick eco-friendly TPE yoga mat with alignment lines. Non-slip surface.', price: 39.99, tags: ['yoga', 'mat', 'fitness', 'eco-friendly'] },
    { name: 'Resistance Bands Set', description: 'Set of 5 latex resistance bands with different tension levels (10-50 lbs).', price: 24.99, tags: ['strength', 'bands', 'set', 'portable'] },
    { name: 'Adjustable Dumbbell Set', description: 'Space-saving adjustable dumbbells from 5-52.5 lbs each. Quick-change weight selection.', price: 349.99, tags: ['strength', 'dumbbells', 'adjustable', 'home-gym'], isFeatured: true },
    { name: 'Speed Jump Rope', description: 'Ball bearing jump rope with adjustable steel cable, foam handles.', price: 16.99, tags: ['cardio', 'jump-rope', 'speed', 'hiit'] },
    { name: 'High-Density Foam Roller', description: '36" foam roller with three density zones. Relieves muscle tension.', price: 29.99, tags: ['recovery', 'foam-roller', 'massage', 'flexibility'] },
    { name: 'Insulated Stainless Steel Water Bottle', description: '32oz double-wall vacuum insulated bottle. Keeps drinks cold 24h or hot 12h.', price: 34.99, tags: ['hydration', 'bottle', 'insulated', 'stainless'], isFeatured: true },
    { name: 'Large Duffel Gym Bag', description: '50L duffel bag with separate shoe compartment, wet pocket.', price: 64.99, tags: ['bag', 'gym', 'duffel', 'travel'] },
    { name: 'Weightlifting Gloves', description: 'Breathable weightlifting gloves with padded palms, wrist wrap support.', price: 19.99, tags: ['strength', 'gloves', 'grip', 'padding'] },
    { name: 'Skipping Rope with Bearings', description: 'Professional speed rope with smooth ball bearing rotation.', price: 14.99, tags: ['cardio', 'jump-rope', 'speed', 'professional'] },
    { name: 'Anti-Burst Exercise Ball', description: '65cm exercise ball with anti-burst construction. Supports up to 600 lbs.', price: 27.99, tags: ['stability', 'exercise-ball', 'core', 'fitness'] },
  ],
  'beauty': [
    { name: 'Hydrating Face Moisturizer', description: 'Lightweight, non-greasy daily moisturizer with hyaluronic acid and ceramides.', price: 32.99, tags: ['skincare', 'moisturizer', 'hydrating', 'hyaluronic'] },
    { name: 'Organic Lip Balm Set', description: 'Set of 6 organic lip balms in assorted flavors. Made with beeswax and coconut oil.', price: 15.99, tags: ['lip-care', 'organic', 'balm', 'set'] },
    { name: 'Professional Hair Dryer', description: 'Ionic hair dryer with 1875W motor, 3 heat/speed settings, cool shot button.', price: 59.99, tags: ['hair-care', 'dryer', 'ionic', 'professional'] },
    { name: '12-Piece Makeup Brush Set', description: 'Complete makeup brush set with synthetic bristles, aluminum ferrules, and bamboo handles.', price: 34.99, tags: ['makeup', 'brushes', 'set', 'bamboo'] },
    { name: 'Gel Nail Polish Starter Kit', description: 'LED lamp + 6 gel nail polish colors + base/top coat + tools.', price: 49.99, tags: ['nails', 'gel', 'kit', 'led'], isFeatured: true },
    { name: 'Body Lotion with Shea Butter', description: 'Rich, fast-absorbing body lotion with 5% shea butter, vitamin E, and aloe vera.', price: 19.99, tags: ['body-care', 'lotion', 'shea-butter', 'moisturizing'] },
    { name: 'Sheet Mask Variety Pack', description: '10-pack of hydrogel sheet masks with different serums (hyaluronic, collagen, vitamin C).', price: 22.99, tags: ['skincare', 'sheet-mask', 'k-beauty', 'hydrating'] },
    { name: 'Long-Lasting Perfume Spray', description: 'Eau de parfum with notes of bergamot, jasmine, and sandalwood. 50ml spray bottle.', price: 74.99, tags: ['fragrance', 'perfume', 'elegant', 'long-lasting'] },
  ],
  'food-drinks': [
    { name: 'Single-Origin Arabica Coffee Beans', description: 'Ethiopian Yirgacheffe light roast whole bean coffee. Floral and citrus notes.', price: 18.99, tags: ['coffee', 'arabica', 'single-origin', 'specialty'], isFeatured: true },
    { name: 'Premium Green Tea Collection', description: '12 varieties of Japanese and Chinese green teas including matcha, sencha, and jasmine.', price: 29.99, tags: ['tea', 'green-tea', 'collection', 'gift'] },
    { name: 'Artisan Dark Chocolate Box', description: '12-piece assortment of single-origin dark chocolates (72-85% cacao).', price: 24.99, tags: ['chocolate', 'dark', 'artisan', 'gourmet'] },
    { name: 'Mixed Premium Nuts Pack', description: '6-pack of roasted and salted almonds, cashews, pecans, walnuts, macadamias, and pistachios.', price: 34.99, tags: ['snacks', 'nuts', 'protein', 'healthy'] },
    { name: 'Plant-Based Protein Bars', description: '12-pack of vegan protein bars with 20g plant protein. No artificial sweeteners.', price: 28.99, tags: ['protein', 'bars', 'vegan', 'snacks'] },
    { name: 'Raw Wildflower Honey', description: 'Unfiltered raw honey sourced from wildflower meadows. 16 oz glass jar.', price: 14.99, tags: ['honey', 'raw', 'wildflower', 'natural'] },
    { name: 'Gourmet Spice Gift Set', description: '12 premium spices in glass jars with grinder tops. Includes black pepper, sea salt, cumin.', price: 42.99, tags: ['spices', 'gourmet', 'set', 'gift'], isFeatured: true },
    { name: 'Extra Virgin Olive Oil', description: 'Cold-pressed extra virgin olive oil from Tuscany, Italy. First harvest.', price: 22.99, tags: ['olive-oil', 'extra-virgin', 'italian', 'cold-pressed'] },
  ],
  'toys': [
    { name: 'Advanced Building Blocks Set', description: '1000-piece building block set with interlocking bricks, wheels, and mini-figures.', price: 49.99, tags: ['building', 'blocks', 'creative', 'stem'], isFeatured: true },
    { name: '1000-Piece Panoramic Puzzle', description: 'High-quality jigsaw puzzle featuring a stunning city skyline.', price: 22.99, tags: ['puzzle', 'panoramic', 'challenge', 'family'] },
    { name: 'Strategy Board Game: Settlers', description: 'Award-winning strategy board game for 2-4 players. Build, trade, and settle.', price: 39.99, tags: ['board-game', 'strategy', 'family', 'award-winning'] },
    { name: 'Plush Teddy Bear', description: 'Super-soft 18" teddy bear with hypoallergenic filling, embroidered eyes.', price: 29.99, tags: ['stuffed-animal', 'plush', 'teddy', 'baby'] },
    { name: 'Remote Control Stunt Car', description: '2.4GHz RC car with 360-degree spinning, dual-sided driving, and rechargeable battery.', price: 44.99, tags: ['rc-car', 'stunt', 'remote-control', 'outdoor'] },
    { name: 'Science Experiment Kit', description: '50+ STEM experiments in chemistry, physics, and biology. Includes safety gear.', price: 34.99, tags: ['stem', 'science', 'experiments', 'educational'] },
  ],
  'music': [
    { name: 'Acoustic Guitar (Dreadnought)', description: 'Full-size dreadnought acoustic guitar with spruce top, mahogany back/sides.', price: 249.99, compareAtPrice: 299.99, tags: ['guitar', 'acoustic', 'dreadnought', 'spruce'], isFeatured: true },
    { name: '88-Key Digital Piano', description: 'Weighted hammer-action digital piano with 128-note polyphony, built-in speakers.', price: 599.99, tags: ['piano', 'digital', 'weighted-keys', '88-key'] },
    { name: 'Maple Drum Sticks (Pair)', description: 'Premium hickory drum sticks with wood tip. 5A size, professional quality.', price: 12.99, tags: ['drums', 'sticks', 'hickory', 'pair'] },
    { name: 'Acoustic Guitar Strings Set', description: 'Phosphor bronze acoustic guitar strings, light gauge (12-53).', price: 8.99, tags: ['guitar', 'strings', 'acoustic', 'phosphor-bronze'] },
    { name: 'USB Condenser Microphone', description: 'Plug-and-play condenser mic with cardioid pattern, gain control, and headphone output.', price: 79.99, tags: ['microphone', 'usb', 'condenser', 'recording'] },
    { name: 'Studio Headphone Stand', description: 'Aluminum headphone stand with weighted base and silicone grip.', price: 34.99, tags: ['accessories', 'stand', 'headphone', 'studio'] },
  ],
  'automotive': [
    { name: 'Magnetic Car Phone Mount', description: 'Ultra-strong magnetic phone mount with adhesive dash plate and air vent clip.', price: 19.99, tags: ['mount', 'phone', 'magnetic', 'accessory'] },
    { name: '4K Dash Camera', description: 'Front and rear dash cam with 4K resolution, night vision, parking mode.', price: 129.99, tags: ['camera', 'dash-cam', '4k', 'safety'], isFeatured: true },
    { name: 'Leather Seat Cover Set', description: 'Universal fit leather seat covers for front seats. Breathable, water-resistant.', price: 89.99, tags: ['interior', 'seat-covers', 'leather', 'protection'] },
    { name: 'Digital Tire Pressure Gauge', description: 'Digital tire inflator with auto-shutoff, LED light, and 150 PSI max.', price: 34.99, tags: ['tool', 'tire', 'pressure', 'digital'] },
    { name: 'Portable Handheld Vacuum', description: '12V car vacuum with 8000Pa suction, HEPA filter, crevice tool, and brush.', price: 54.99, tags: ['vacuum', 'portable', 'car', 'cleaning'] },
  ],
};

// ──────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────

const db = db.getSiblingDB('ecommerce');
const now = new Date();

print(`Seeding database: ${db.getName()}`);

// ── Drop existing collections ──
const collections = db.getCollectionNames();
const toDrop = ['categories', 'products', 'users', 'orders', 'carts', 'outbox'];
for (const name of toDrop) {
  if (collections.includes(name)) {
    db[name].drop();
    print(`  Dropped "${name}"`);
  }
}

// ── Create indexes ──
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ parentId: 1 });
db.categories.createIndex({ sortOrder: 1 });

db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ categoryId: 1 });
db.products.createIndex({ isActive: 1, isFeatured: 1 });
db.products.createIndex({ tags: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ name: 'text', description: 'text' }, { default_language: 'english', weights: { name: 10, description: 5 } });

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });

db.carts.createIndex({ userId: 1 }, { unique: true, sparse: true });
db.carts.createIndex({ sessionId: 1 }, { unique: true, sparse: true });
db.carts.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

db.outbox.createIndex({ eventId: 1 }, { unique: true });
db.outbox.createIndex({ status: 1, createdAt: 1 });

print('  All indexes created.');

// ── Seed Categories ──
const categoryDocs = CATEGORIES.map(cat => ({
  _id: UUID().toString(),
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  sortOrder: cat.sortOrder,
  createdAt: now,
}));
db.categories.insertMany(categoryDocs);
print(`  Inserted ${categoryDocs.length} categories.`);

// Build slug → _id map
const slugIdMap = {};
for (const cat of categoryDocs) {
  slugIdMap[cat.slug] = cat._id;
}

// ── Seed Products ──
const variantNames = ['Default', 'Premium', 'Value'];
let productIndex = 0;
const productDocs = [];

for (const cat of CATEGORIES) {
  const products = PRODUCTS_BY_CATEGORY[cat.slug] || [];
  for (const prod of products) {
    productIndex++;
    const inventory = 10 + Math.floor(Math.random() * 491);
    const variantCount = 1 + Math.floor(Math.random() * 3);
    const variants = Array.from({ length: variantCount }, (_, vi) => ({
      name: variantNames[vi] || `Variant ${vi + 1}`,
      sku: `SKU-${String(productIndex).padStart(5, '0')}-${String(vi + 1).padStart(2, '0')}`,
      price: vi === 0 ? undefined : Number((prod.price * (0.8 + Math.random() * 0.4)).toFixed(2)),
      inventory: vi === 0 ? inventory : Math.floor(inventory / (vi + 1)),
    }));

    const imageUrls = [
      `https://picsum.photos/seed/prod${productIndex}/600/600`,
      `https://picsum.photos/seed/prod${productIndex}a/600/600`,
      `https://picsum.photos/seed/prod${productIndex}b/600/600`,
    ];

    const slug = `${cat.slug}-${prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${productIndex}`;

    productDocs.push({
      _id: UUID().toString(),
      name: prod.name,
      slug: slug,
      description: prod.description,
      price: prod.price,
      compareAtPrice: prod.compareAtPrice || null,
      categoryId: slugIdMap[cat.slug],
      images: imageUrls,
      variants: variants,
      inventory: inventory,
      tags: prod.tags,
      isActive: true,
      isFeatured: prod.isFeatured || false,
      rating: Number((Math.random() * 5).toFixed(1)),
      reviewCount: Math.floor(Math.random() * 500),
      createdAt: now,
      updatedAt: now,
    });
  }
}

db.products.insertMany(productDocs);
print(`  Inserted ${productDocs.length} products.`);

// ── Seed Users ──
const userDocs = [
  {
    _id: UUID().toString(),
    email: 'admin@example.com',
    passwordHash: '$2a$10$dummy', // will be updated by auth system
    name: 'Admin User',
    role: 'admin',
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    _id: UUID().toString(),
    email: 'customer@example.com',
    passwordHash: '$2a$10$dummy',
    name: 'Jane Customer',
    role: 'customer',
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  },
];

db.users.insertMany(userDocs);
print('  Inserted 2 users (admin + customer).');

// ── Summary ──
print('\n✅ Seed complete!');
print(`   Categories: ${categoryDocs.length}`);
print(`   Products:   ${productDocs.length}`);
print(`   Users:      2`);
print(`\n   Admin login:    admin@example.com / admin123`);
print(`   Customer login: customer@example.com / customer123`);
