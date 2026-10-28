// FoodBridge API server — Express + Socket.io + SQLite.
require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { initDb, all, run } = require('./db');
const { verifyToken } = require('./middleware/auth');
const { requestLogger, notFound, errorHandler } = require('./middleware/common');
const { UPLOAD_DIR } = require('./middleware/upload');
const { setIo, notifyUser, broadcastDonationUpdate } = require('./services/notify');

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const CLIENT_BUILD = path.join(__dirname, '..', '..', 'client', 'dist');

async function start() {
  await initDb();
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });
  setIo(io);

  // ---- Middleware pipeline ----
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

  // ---- REST API ----
  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/donations', require('./routes/donations'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/stats', require('./routes/stats'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api', notFound);

  // Serve the built React app in production (npm run build in /client).
  if (fs.existsSync(CLIENT_BUILD)) {
    app.use(express.static(CLIENT_BUILD));
    app.get(/^(?!\/(api|uploads|socket\.io)).*/, (req, res) => res.sendFile(path.join(CLIENT_BUILD, 'index.html')));
  }
  app.use(errorHandler);

  // ---- Real-time: each socket joins a private room for its user ----
  io.use((socket, next) => {
    try {
      socket.user = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
  });

  // ---- Background job: expire food whose safe time has passed (every minute) ----
  const expireJob = () => {
    const now = new Date().toISOString();
    const expired = all(`SELECT id, donor_id, title FROM donations WHERE status = 'available' AND expires_at <= ?`, [now]);
    for (const d of expired) {
      run(`UPDATE donations SET status = 'expired' WHERE id = ?`, [d.id]);
      notifyUser(d.donor_id, `"${d.title}" expired before anyone claimed it.`, 'expired', d.id);
      broadcastDonationUpdate(d.id, 'expired');
    }
  };
  expireJob();
  setInterval(expireJob, 60 * 1000);

  server.listen(PORT, () => {
    console.log(`FoodBridge server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
