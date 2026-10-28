// Seed demo data: run `npm run seed` (this RESETS the database).
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'foodbridge.db');
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

const { initDb, run } = require('./db');

const hoursFromNow = (h) => new Date(Date.now() + h * 36e5).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 36e5).toISOString();

(async () => {
  await initDb();
  const hash = (p) => bcrypt.hashSync(p, 10);

  // Demo city: New Delhi. Change the coordinates to your own city if you like.
  const users = [
    ['Admin', 'admin@foodbridge.in', 'admin123', 'admin', '9000000000', 'FoodBridge', 'platform', 'New Delhi', 28.6139, 77.209, 'any', 50],
    ['Rahul Mehta', 'hotel@demo.com', 'demo123', 'donor', '9811111111', 'Hotel Saffron Grand', 'restaurant', 'Connaught Place, New Delhi', 28.6315, 77.2167, 'any', 50],
    ['Priya Sharma', 'hostel@demo.com', 'demo123', 'donor', '9822222222', 'Girls Hostel Mess, North Campus', 'hostel', 'North Campus, Delhi', 28.6880, 77.2090, 'any', 50],
    ['Amit Verma', 'events@demo.com', 'demo123', 'donor', '9833333333', 'Royal Banquets', 'event', 'Karol Bagh, New Delhi', 28.6519, 77.1909, 'any', 50],
    ['Sunita Rao', 'home@demo.com', 'demo123', 'donor', '9844444444', null, 'household', 'Lajpat Nagar, New Delhi', 28.5677, 77.2433, 'any', 50],
    ['Feeding Hands NGO', 'ngo@demo.com', 'demo123', 'receiver', '9855555555', 'Feeding Hands Foundation', 'ngo', 'Paharganj, New Delhi', 28.6448, 77.2167, 'any', 120],
    ['Asha Shelter Home', 'shelter@demo.com', 'demo123', 'receiver', '9866666666', 'Asha Shelter Home', 'shelter', 'Kashmere Gate, Delhi', 28.6675, 77.2280, 'veg', 40],
    ['Roti Bank Volunteers', 'rotibank@demo.com', 'demo123', 'receiver', '9877777777', 'Roti Bank Delhi', 'community', 'Okhla, New Delhi', 28.5450, 77.2730, 'any', 80],
  ];
  const ids = {};
  for (const u of users) {
    const { lastInsertRowid } = run(
      `INSERT INTO users (name, email, password_hash, role, phone, org_name, org_type, address, lat, lng, food_preference, capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u[0], u[1], hash(u[2]), u[3], u[4], u[5], u[6], u[7], u[8], u[9], u[10], u[11]]
    );
    ids[u[1]] = lastInsertRowid;
  }

  const donations = [
    // [donor, title, description, category, food_type, qty, address, lat, lng, expires, status, claimer, created]
    ['hotel@demo.com', 'Veg Biryani & Raita', 'Leftover from lunch buffet, packed in foil trays. Freshly cooked at 1 PM.', 'cooked', 'veg', 40, 'Connaught Place, New Delhi', 28.6315, 77.2167, hoursFromNow(3), 'available', null, hoursAgo(1)],
    ['events@demo.com', 'Wedding Buffet — Paneer, Dal, Rotis', 'Surplus from a wedding reception. Paneer butter masala, dal makhani, 200 rotis.', 'cooked', 'veg', 100, 'Karol Bagh, New Delhi', 28.6519, 77.1909, hoursFromNow(1.5), 'available', null, hoursAgo(0.5)],
    ['hostel@demo.com', 'Bread & Buns', 'Two crates of bread loaves and buns from the morning breakfast.', 'bakery', 'veg', 60, 'North Campus, Delhi', 28.6880, 77.2090, hoursFromNow(20), 'available', null, hoursAgo(2)],
    ['home@demo.com', 'Fresh Fruits Box', 'Bananas and apples, about 5 kg.', 'fruits_veg', 'veg', 15, 'Lajpat Nagar, New Delhi', 28.5677, 77.2433, hoursFromNow(36), 'available', null, hoursAgo(3)],
    ['hotel@demo.com', 'Chicken Curry & Rice', 'Dinner surplus, kept in hot case.', 'cooked', 'nonveg', 25, 'Connaught Place, New Delhi', 28.6315, 77.2167, hoursFromNow(2.5), 'available', null, hoursAgo(0.3)],
    ['events@demo.com', 'Packaged Juice & Snacks', 'Sealed juice boxes and chips packets from a corporate event.', 'packaged', 'veg', 80, 'Karol Bagh, New Delhi', 28.6519, 77.1909, hoursFromNow(72), 'claimed', 'ngo@demo.com', hoursAgo(5)],
    ['hostel@demo.com', 'Rajma Chawal', 'Dinner leftovers from mess.', 'cooked', 'veg', 50, 'North Campus, Delhi', 28.6880, 77.2090, hoursAgo(10), 'delivered', 'shelter@demo.com', hoursAgo(16)],
    ['hotel@demo.com', 'Breakfast Buffet Surplus', 'Poha, upma and idli.', 'cooked', 'veg', 70, 'Connaught Place, New Delhi', 28.6315, 77.2167, hoursAgo(20), 'delivered', 'ngo@demo.com', hoursAgo(26)],
    ['events@demo.com', 'Birthday Party Food', 'Pasta, sandwiches and cake.', 'cooked', 'mixed', 45, 'Karol Bagh, New Delhi', 28.6519, 77.1909, hoursAgo(30), 'delivered', 'rotibank@demo.com', hoursAgo(36)],
  ];
  for (const d of donations) {
    const created = d[12];
    const claimer = d[11] ? ids[d[11]] : null;
    const claimedAt = claimer ? new Date(new Date(created).getTime() + 20 * 60000).toISOString() : null;
    const pickedAt = d[10] === 'delivered' ? new Date(new Date(created).getTime() + 60 * 60000).toISOString() : null;
    const deliveredAt = d[10] === 'delivered' ? new Date(new Date(created).getTime() + 120 * 60000).toISOString() : null;
    run(
      `INSERT INTO donations (donor_id, title, description, category, food_type, quantity, address, lat, lng, expires_at,
         status, claimed_by, claimed_at, picked_at, delivered_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ids[d[0]], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9], d[10], claimer, claimedAt, pickedAt, deliveredAt, created]
    );
  }

  console.log('Database seeded. Demo accounts (password demo123, admin: admin123):');
  console.log(users.map((u) => `  ${u[3].padEnd(8)} ${u[1]}`).join('\n'));
})();
