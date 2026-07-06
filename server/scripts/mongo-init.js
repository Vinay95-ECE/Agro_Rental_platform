// MongoDB initialization script — runs once on first container start
// Creates indexes for production performance

db = db.getSiblingDB('agrirent_hub');

// ─── Users indexes ─────────────────────────────────────────────────────────────
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ 'location': '2dsphere' }, { sparse: true });

// ─── Tools indexes ─────────────────────────────────────────────────────────────
db.tools.createIndex({ 'location': '2dsphere' });
db.tools.createIndex({ category: 1, status: 1 });
db.tools.createIndex({ owner: 1 });
db.tools.createIndex({ name: 'text', description: 'text' });
db.tools.createIndex({ 'rentRates.daily': 1 });
db.tools.createIndex({ createdAt: -1 });

// ─── Bookings indexes ──────────────────────────────────────────────────────────
db.bookings.createIndex({ tool: 1, status: 1 });
db.bookings.createIndex({ farmer: 1, createdAt: -1 });
db.bookings.createIndex({ owner: 1, status: 1 });
db.bookings.createIndex({ startDate: 1, endDate: 1 });
db.bookings.createIndex({ createdAt: -1 });

// ─── Products indexes ──────────────────────────────────────────────────────────
db.products.createIndex({ type: 1, category: 1 });
db.products.createIndex({ seller: 1 });
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ price: 1 });

// ─── Crops indexes ─────────────────────────────────────────────────────────────
db.crops.createIndex({ 'location': '2dsphere' });
db.crops.createIndex({ farmer: 1 });
db.crops.createIndex({ cropName: 'text' });
db.crops.createIndex({ status: 1, createdAt: -1 });

// ─── KYC indexes ───────────────────────────────────────────────────────────────
db.kycs.createIndex({ user: 1 }, { unique: true });
db.kycs.createIndex({ status: 1 });
db.kycs.createIndex({ createdAt: -1 });

// ─── Notifications indexes ─────────────────────────────────────────────────────
db.notifications.createIndex({ user: 1, read: 1, createdAt: -1 });

// ─── Chat indexes ──────────────────────────────────────────────────────────────
db.chats.createIndex({ roomId: 1, createdAt: -1 });
db.chats.createIndex({ sender: 1, receiver: 1 });

// ─── Payments indexes ─────────────────────────────────────────────────────────
db.payments.createIndex({ user: 1, createdAt: -1 });
db.payments.createIndex({ booking: 1 });
db.payments.createIndex({ status: 1 });

print('✅ AgriRent Hub: MongoDB indexes created successfully.');
