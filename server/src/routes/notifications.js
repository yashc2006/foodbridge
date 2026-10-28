// Notification routes: list and mark as read.
const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const items = all('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id]);
  const { n } = get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ items, unread: n });
});

router.post('/read-all', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/read', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
