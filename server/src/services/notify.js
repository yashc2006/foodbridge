// Real-time notifications: saves to DB and pushes over Socket.io.
const { run, get } = require('../db');

let io = null;

function setIo(instance) {
  io = instance;
}

// Send a notification to one user (stored + pushed live).
function notifyUser(userId, message, type = 'info', donationId = null) {
  const { lastInsertRowid } = run(
    'INSERT INTO notifications (user_id, message, type, donation_id) VALUES (?, ?, ?, ?)',
    [userId, message, type, donationId]
  );
  const notification = get('SELECT * FROM notifications WHERE id = ?', [lastInsertRowid]);
  if (io) io.to(`user:${userId}`).emit('notification', notification);
  return notification;
}

// Tell every connected client that a donation changed so maps/lists refresh live.
function broadcastDonationUpdate(donationId, status) {
  if (io) io.emit('donation:update', { id: donationId, status });
}

module.exports = { setIo, notifyUser, broadcastDonationUpdate };
