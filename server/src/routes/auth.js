// Auth routes: register, login, current user profile.
const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { requireFields, rateLimit } = require('../middleware/common');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PUBLIC_FIELDS =
  'id, name, email, role, phone, org_name, org_type, address, lat, lng, food_preference, capacity, created_at';

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.post('/register', rateLimit({ max: 15 }), requireFields('name', 'email', 'password', 'role'), (req, res) => {
  const { name, email, password, role, phone, org_name, org_type, address, food_preference, capacity } = req.body;
  if (!['donor', 'receiver'].includes(role)) return res.status(400).json({ error: 'Role must be donor or receiver' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const normalizedEmail = String(email).trim().toLowerCase();
  if (get('SELECT id FROM users WHERE email = ?', [normalizedEmail])) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const pref = ['any', 'veg', 'nonveg'].includes(food_preference) ? food_preference : 'any';
  const cap = Math.max(1, parseInt(capacity, 10) || 50);
  const hash = bcrypt.hashSync(String(password), 10);

  const { lastInsertRowid } = run(
    `INSERT INTO users (name, email, password_hash, role, phone, org_name, org_type, address, lat, lng, food_preference, capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [String(name).trim(), normalizedEmail, hash, role, phone, org_name, org_type, address,
      toNumberOrNull(req.body.lat), toNumberOrNull(req.body.lng), pref, cap]
  );
  const user = get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [lastInsertRowid]);
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', rateLimit({ max: 20 }), requireFields('email', 'password'), (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const row = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!row || !bcrypt.compareSync(String(req.body.password), row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  const user = get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [row.id]);
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.user.id]));
});

// Update profile / location / preferences.
router.put('/me', requireAuth, (req, res) => {
  const current = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const b = req.body;
  const pref = ['any', 'veg', 'nonveg'].includes(b.food_preference) ? b.food_preference : current.food_preference;
  run(
    `UPDATE users SET name = ?, phone = ?, org_name = ?, org_type = ?, address = ?, lat = ?, lng = ?,
       food_preference = ?, capacity = ? WHERE id = ?`,
    [
      b.name?.trim() || current.name,
      b.phone ?? current.phone,
      b.org_name ?? current.org_name,
      b.org_type ?? current.org_type,
      b.address ?? current.address,
      b.lat !== undefined ? toNumberOrNull(b.lat) : current.lat,
      b.lng !== undefined ? toNumberOrNull(b.lng) : current.lng,
      pref,
      b.capacity !== undefined ? Math.max(1, parseInt(b.capacity, 10) || current.capacity) : current.capacity,
      req.user.id,
    ]
  );
  res.json(get(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.user.id]));
});

module.exports = router;
