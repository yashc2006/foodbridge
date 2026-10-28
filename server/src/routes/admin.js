// Admin routes: overview of all users and donations.
const express = require('express');
const { all, get } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', (req, res) => {
  const statuses = all('SELECT status, COUNT(*) AS n FROM donations GROUP BY status');
  const categories = all('SELECT category, COUNT(*) AS n, SUM(quantity) AS servings FROM donations GROUP BY category');
  const roles = all('SELECT role, COUNT(*) AS n FROM users GROUP BY role');
  const avgClaim = get(`SELECT AVG((julianday(claimed_at) - julianday(created_at)) * 24 * 60) AS mins
                        FROM donations WHERE claimed_at IS NOT NULL`);
  res.json({
    byStatus: Object.fromEntries(statuses.map((r) => [r.status, r.n])),
    byCategory: categories,
    byRole: Object.fromEntries(roles.map((r) => [r.role, r.n])),
    avgMinutesToClaim: avgClaim.mins == null ? null : Math.round(avgClaim.mins),
  });
});

router.get('/users', (req, res) => {
  res.json(all(`SELECT u.id, u.name, u.email, u.role, u.org_name, u.org_type, u.phone, u.created_at,
      (SELECT COUNT(*) FROM donations d WHERE d.donor_id = u.id) AS posted,
      (SELECT COUNT(*) FROM donations d WHERE d.claimed_by = u.id) AS claimed
    FROM users u ORDER BY u.id DESC`));
});

router.get('/donations', (req, res) => {
  res.json(all(`SELECT d.*, u.name AS donor_name, u.org_name AS donor_org, c.name AS claimer_name, c.org_name AS claimer_org
    FROM donations d JOIN users u ON u.id = d.donor_id LEFT JOIN users c ON c.id = d.claimed_by
    ORDER BY d.id DESC`));
});

module.exports = router;
