// Authentication & authorization middleware (JWT based).
const jwt = require('jsonwebtoken');
const { get } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge-dev-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Requires a valid "Authorization: Bearer <token>" header.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const payload = verifyToken(token);
    const user = get('SELECT id, name, email, role FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to certain roles, e.g. requireRole('donor').
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Only ${roles.join(' / ')} can do this` });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, requireAuth, requireRole };
