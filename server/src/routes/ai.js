// AI helper route: analyse a food description before posting.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireFields } = require('../middleware/common');
const { analyzeFood } = require('../services/foodAnalyzer');

const router = express.Router();

router.post('/analyze', requireAuth, requireFields('text'), async (req, res, next) => {
  try {
    res.json(await analyzeFood(req.body.text));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
