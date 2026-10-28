// General-purpose middleware: request logging, validation, 404 and error handling.

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
}

// validate({ field: 'required' | fn }) — simple required-field validator.
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => req.body[f] === undefined || String(req.body[f]).trim() === '');
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    next();
  };
}

// Simple in-memory rate limiter for auth routes (prevents brute force).
function rateLimit({ windowMs = 60000, max = 20 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    hits.set(key, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests, try again in a minute' });
    next();
  };
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be under 5 MB' });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || 'Server error' });
}

module.exports = { requestLogger, requireFields, rateLimit, notFound, errorHandler };
