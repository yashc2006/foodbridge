// Database layer: SQLite via sql.js (pure WebAssembly, no native build needed).
// The database is kept in memory and saved to data/foodbridge.db after every write.
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'foodbridge.db');

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('donor','receiver','admin')),
  phone TEXT,
  org_name TEXT,
  org_type TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  food_preference TEXT DEFAULT 'any' CHECK (food_preference IN ('any','veg','nonveg')),
  capacity INTEGER DEFAULT 50,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('cooked','raw','packaged','bakery','fruits_veg','other')),
  food_type TEXT NOT NULL CHECK (food_type IN ('veg','nonveg','mixed')),
  quantity INTEGER NOT NULL,
  image TEXT,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','claimed','picked_up','delivered','expired','cancelled')),
  claimed_by INTEGER REFERENCES users(id),
  claimed_at TEXT,
  picked_at TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  donation_id INTEGER,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
`;

async function initDb() {
  const SQL = await initSqlJs();
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  save();
  return db;
}

function save() {
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

// sql.js cannot bind `undefined`, so convert it to null.
const clean = (params) => params.map((p) => (p === undefined ? null : p));

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(clean(params));
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, clean(params));
  const changes = db.getRowsModified();
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
  save();
  return { lastInsertRowid: id, changes };
}

module.exports = { initDb, all, get, run, save };
