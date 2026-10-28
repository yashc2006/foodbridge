// Impact statistics (public) and personal stats.
const express = require('express');
const { get, all } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Rough conversion factors used for the impact counter.
const KG_PER_SERVING = 0.4;   // ~400 g per meal serving
const CO2_PER_KG_FOOD = 2.5;  // kg CO2-equivalent avoided per kg of food not wasted

function impact(where = '', params = []) {
  const row = get(
    `SELECT COUNT(*) AS donations, COALESCE(SUM(quantity), 0) AS meals FROM donations WHERE status = 'delivered' ${where}`,
    params
  );
  const kg = row.meals * KG_PER_SERVING;
  return {
    deliveredDonations: row.donations,
    mealsServed: row.meals,
    foodSavedKg: Math.round(kg),
    co2SavedKg: Math.round(kg * CO2_PER_KG_FOOD),
  };
}

router.get('/public', (req, res) => {
  const counts = get(`SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'donor') AS donors,
      (SELECT COUNT(*) FROM users WHERE role = 'receiver') AS receivers,
      (SELECT COUNT(*) FROM donations WHERE status = 'available' AND expires_at > ?) AS availableNow`, [new Date().toISOString()]);
  res.json({ ...impact(), ...counts });
});

router.get('/me', requireAuth, (req, res) => {
  const col = req.user.role === 'receiver' ? 'claimed_by' : 'donor_id';
  const byStatus = all(`SELECT status, COUNT(*) AS n FROM donations WHERE ${col} = ? GROUP BY status`, [req.user.id]);
  res.json({
    ...impact(`AND ${col} = ?`, [req.user.id]),
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])),
  });
});

module.exports = router;
