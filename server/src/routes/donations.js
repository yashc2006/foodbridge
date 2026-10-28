// Donation routes: post surplus food, browse, claim, and track it until delivered.
//
// Status flow:  available --claim--> claimed --pickup--> picked_up --deliver--> delivered
//               available/claimed --cancel--> cancelled     available --(time)--> expired
const express = require('express');
const fs = require('fs');
const { all, get, run } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFields } = require('../middleware/common');
const { upload } = require('../middleware/upload');
const { scoreMatch, MAX_DISTANCE_KM } = require('../services/matching');
const { notifyUser, broadcastDonationUpdate } = require('../services/notify');

const router = express.Router();
router.use(requireAuth);

const CATEGORIES = ['cooked', 'raw', 'packaged', 'bakery', 'fruits_veg', 'other'];
const FOOD_TYPES = ['veg', 'nonveg', 'mixed'];

const DONATION_SELECT = `
  SELECT d.*,
         u.name AS donor_name, u.org_name AS donor_org, u.phone AS donor_phone,
         c.name AS claimer_name, c.org_name AS claimer_org, c.phone AS claimer_phone
  FROM donations d
  JOIN users u ON u.id = d.donor_id
  LEFT JOIN users c ON c.id = d.claimed_by`;

const nowIso = () => new Date().toISOString();

function findDonation(id) {
  return get(`${DONATION_SELECT} WHERE d.id = ?`, [id]);
}

function activeClaimCounts() {
  const rows = all(`SELECT claimed_by, COUNT(*) AS n FROM donations
                    WHERE status IN ('claimed','picked_up') AND claimed_by IS NOT NULL GROUP BY claimed_by`);
  return Object.fromEntries(rows.map((r) => [r.claimed_by, r.n]));
}

// Rank all receivers for a donation (used to notify the best matches and show donors suggestions).
function rankReceivers(donation, limit = 5) {
  const counts = activeClaimCounts();
  return all(`SELECT id, name, org_name, org_type, lat, lng, food_preference, capacity FROM users WHERE role = 'receiver'`)
    .map((r) => ({ receiver: r, ...scoreMatch(donation, r, counts[r.id] || 0) }))
    .filter((m) => m.compatible && (m.distanceKm == null || m.distanceKm <= MAX_DISTANCE_KM))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// GET /api/donations — available food. Receivers get a personalised match score and ranking.
router.get('/', (req, res) => {
  const rows = all(`${DONATION_SELECT} WHERE d.status = 'available' AND d.expires_at > ? ORDER BY d.expires_at ASC`, [nowIso()]);

  if (req.user.role !== 'receiver') return res.json(rows);

  const me = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const myClaims = activeClaimCounts()[me.id] || 0;
  const ranked = rows
    .map((d) => ({ ...d, match: scoreMatch(d, me, myClaims) }))
    .filter((d) => d.match.compatible);
  if (req.query.sort === 'distance') ranked.sort((a, b) => (a.match.distanceKm ?? 1e9) - (b.match.distanceKm ?? 1e9));
  else if (req.query.sort === 'expiry') ranked.sort((a, b) => a.expires_at.localeCompare(b.expires_at));
  else ranked.sort((a, b) => b.match.score - a.match.score);
  res.json(ranked);
});

// GET /api/donations/mine — donor: what I posted; receiver: what I claimed.
router.get('/mine', (req, res) => {
  const column = req.user.role === 'receiver' ? 'd.claimed_by' : 'd.donor_id';
  res.json(all(`${DONATION_SELECT} WHERE ${column} = ? ORDER BY d.created_at DESC`, [req.user.id]));
});

// GET /api/donations/:id — details (+ suggested receivers for the owner).
router.get('/:id', (req, res) => {
  const d = findDonation(req.params.id);
  if (!d) return res.status(404).json({ error: 'Donation not found' });
  const result = { ...d };
  if (d.donor_id === req.user.id && d.status === 'available') {
    result.suggestedReceivers = rankReceivers(d).map((m) => ({
      id: m.receiver.id, name: m.receiver.org_name || m.receiver.name, score: m.score,
      distanceKm: m.distanceKm, reasons: m.reasons,
    }));
  }
  if (req.user.role === 'receiver') {
    const me = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    result.match = scoreMatch(d, me, activeClaimCounts()[me.id] || 0);
  }
  res.json(result);
});

// POST /api/donations — donor posts surplus food (multipart form with optional "image").
router.post('/', requireRole('donor'), upload.single('image'), requireFields('title', 'category', 'food_type', 'quantity', 'lat', 'lng', 'expires_at'), (req, res) => {
  const b = req.body;
  const removeUpload = () => req.file && fs.unlink(req.file.path, () => {});
  const fail = (msg) => { removeUpload(); return res.status(400).json({ error: msg }); };

  if (!CATEGORIES.includes(b.category)) return fail('Invalid category');
  if (!FOOD_TYPES.includes(b.food_type)) return fail('Invalid food type');
  const quantity = parseInt(b.quantity, 10);
  if (!(quantity > 0 && quantity <= 10000)) return fail('Quantity must be between 1 and 10000 servings');
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return fail('Invalid pickup location');
  const expires = new Date(b.expires_at);
  if (Number.isNaN(expires.getTime())) return fail('Invalid expiry time');
  if (expires.getTime() <= Date.now()) return fail('Expiry time must be in the future');

  const { lastInsertRowid } = run(
    `INSERT INTO donations (donor_id, title, description, category, food_type, quantity, image, address, lat, lng, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, String(b.title).trim(), b.description, b.category, b.food_type, quantity,
      req.file ? `/uploads/${req.file.filename}` : null, b.address, lat, lng, expires.toISOString()]
  );
  const donation = findDonation(lastInsertRowid);

  // Smart matching: alert the best-matched nearby receivers in real time.
  const matches = rankReceivers(donation, 5).filter((m) => m.score >= 35);
  for (const m of matches) {
    const dist = m.distanceKm != null ? ` · ${m.distanceKm} km away` : '';
    notifyUser(m.receiver.id, `New food match (${m.score}%): ${donation.title} — ${quantity} servings${dist}`, 'match', donation.id);
  }
  broadcastDonationUpdate(donation.id, 'available');
  res.status(201).json({ ...donation, notifiedReceivers: matches.length });
});

// POST /api/donations/:id/claim — receiver claims food. Atomic: only one receiver can win.
router.post('/:id/claim', requireRole('receiver'), (req, res) => {
  const now = nowIso();
  const { changes } = run(
    `UPDATE donations SET status = 'claimed', claimed_by = ?, claimed_at = ?
     WHERE id = ? AND status = 'available' AND expires_at > ?`,
    [req.user.id, now, req.params.id, now]
  );
  if (!changes) {
    const exists = findDonation(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Donation not found' });
    return res.status(409).json({ error: 'Sorry, this food was already claimed or has expired' });
  }
  const d = findDonation(req.params.id);
  notifyUser(d.donor_id, `${d.claimer_org || d.claimer_name} claimed "${d.title}". They will come for pickup.`, 'claimed', d.id);
  broadcastDonationUpdate(d.id, 'claimed');
  res.json(d);
});

// POST /api/donations/:id/unclaim — receiver releases a claim so others can take it.
router.post('/:id/unclaim', requireRole('receiver'), (req, res) => {
  const { changes } = run(
    `UPDATE donations SET status = 'available', claimed_by = NULL, claimed_at = NULL
     WHERE id = ? AND claimed_by = ? AND status = 'claimed'`,
    [req.params.id, req.user.id]
  );
  if (!changes) return res.status(409).json({ error: 'You can only release food you claimed and have not picked up' });
  const d = findDonation(req.params.id);
  notifyUser(d.donor_id, `The claim on "${d.title}" was released. It is available again.`, 'info', d.id);
  broadcastDonationUpdate(d.id, 'available');
  res.json(d);
});

// POST /api/donations/:id/pickup — donor or claiming receiver confirms the food was collected.
router.post('/:id/pickup', (req, res) => {
  const d = findDonation(req.params.id);
  if (!d) return res.status(404).json({ error: 'Donation not found' });
  if (d.donor_id !== req.user.id && d.claimed_by !== req.user.id) return res.status(403).json({ error: 'Not your donation' });
  if (d.status !== 'claimed') return res.status(409).json({ error: `Cannot mark as picked up when status is "${d.status}"` });
  run(`UPDATE donations SET status = 'picked_up', picked_at = ? WHERE id = ?`, [nowIso(), d.id]);
  const other = req.user.id === d.donor_id ? d.claimed_by : d.donor_id;
  notifyUser(other, `"${d.title}" has been picked up.`, 'picked_up', d.id);
  broadcastDonationUpdate(d.id, 'picked_up');
  res.json(findDonation(d.id));
});

// POST /api/donations/:id/deliver — receiver confirms food was distributed to people.
router.post('/:id/deliver', requireRole('receiver'), (req, res) => {
  const d = findDonation(req.params.id);
  if (!d) return res.status(404).json({ error: 'Donation not found' });
  if (d.claimed_by !== req.user.id) return res.status(403).json({ error: 'Not your claim' });
  if (d.status !== 'picked_up') return res.status(409).json({ error: 'Mark as picked up first' });
  run(`UPDATE donations SET status = 'delivered', delivered_at = ? WHERE id = ?`, [nowIso(), d.id]);
  notifyUser(d.donor_id, `Thank you! Your "${d.title}" fed ${d.quantity} people. 🎉`, 'delivered', d.id);
  broadcastDonationUpdate(d.id, 'delivered');
  res.json(findDonation(d.id));
});

// POST /api/donations/:id/cancel — donor (or admin) withdraws a donation.
router.post('/:id/cancel', (req, res) => {
  const d = findDonation(req.params.id);
  if (!d) return res.status(404).json({ error: 'Donation not found' });
  if (d.donor_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your donation' });
  if (!['available', 'claimed'].includes(d.status)) return res.status(409).json({ error: `Cannot cancel when status is "${d.status}"` });
  run(`UPDATE donations SET status = 'cancelled' WHERE id = ?`, [d.id]);
  if (d.claimed_by) notifyUser(d.claimed_by, `"${d.title}" was cancelled by the donor.`, 'cancelled', d.id);
  broadcastDonationUpdate(d.id, 'cancelled');
  res.json(findDonation(d.id));
});

module.exports = router;
